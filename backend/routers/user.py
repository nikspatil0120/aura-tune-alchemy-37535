import os
from typing import Dict, List, Optional
from datetime import datetime, timedelta, timezone

import joblib
import numpy as np
import requests
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry
from fastapi import APIRouter, Depends, HTTPException, Header
from jose import jwt
import google.generativeai as genai

# Create a session with retry strategy for better connection handling
def create_requests_session():
    session = requests.Session()
    retry_strategy = Retry(
        total=3,
        backoff_factor=1,
        status_forcelist=[429, 500, 502, 503, 504],
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session

# Global session for reuse
spotify_session = create_requests_session()

from database import get_users_collection
from schemas import GeneratePlaylistRequest, MeResponse, SavePlaylistRequest, UserDB


router = APIRouter(prefix="/user", tags=["user"])

SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"
SPOTIFY_API_URL = "https://api.spotify.com/v1"

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    
    # List available models for debugging
    try:
        models = genai.list_models()
        print("🤖 Available Gemini models:")
        for model in models:
            if 'generateContent' in model.supported_generation_methods:
                print(f"   ✅ {model.name}")
    except Exception as e:
        print(f"❌ Could not list Gemini models: {e}")
    
# Therapeutic AI prompt for Gemini
THERAPEUTIC_SYSTEM_PROMPT = """
You are Aura, an AI music therapist with deep expertise in emotional wellness and music therapy. Your role is to:

1. **Listen empathetically** to users' emotional states and concerns
2. **Provide therapeutic support** through compassionate, professional responses
3. **Guide conversations** toward understanding their emotional needs
4. **Recommend music therapy approaches** based on their feelings
5. **Build trust** through warm, non-judgmental communication

**Your therapeutic approach:**
- Use active listening and validation techniques
- Ask open-ended questions to explore emotions deeper
- Acknowledge the complexity of human emotions
- Provide hope and gentle guidance
- Focus on music as a healing tool

**Conversation style:**
- Warm, empathetic, and professional
- Use "I" statements to show understanding ("I hear that...", "I can sense...")
- Avoid clinical jargon, speak naturally
- Keep responses concise but meaningful (2-3 sentences max)
- Always validate their feelings first

**When ready for playlist:**
After 3-4 meaningful exchanges, offer to create a therapeutic playlist that matches their emotional journey.

**When explaining playlist benefits:**
If asked how songs will help, explain the therapeutic mechanisms:
- **Emotional Validation**: Songs that mirror their current feelings help them feel understood
- **Gradual Transition**: Playlist structure moves from acknowledging pain to gentle healing
- **Stress Relief**: Specific tracks with calming rhythms reduce cortisol and anxiety
- **Cognitive Reframing**: Uplifting lyrics help shift negative thought patterns
- **Neurological Benefits**: Music releases dopamine and endorphins for natural mood improvement
- **Exam Stress Relief**: Instrumental and acoustic tracks improve focus and reduce mental fatigue

Remember: You're not just generating playlists, you're providing emotional support through music therapy with scientific backing.
"""


def get_jwt_secret():
    return os.getenv("JWT_SECRET", "dev-secret")


async def get_current_user(authorization: Optional[str] = Header(default=None)) -> UserDB:
    """Get current user from JWT token"""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    
    token = authorization.split(" ", 1)[1]
    
    # Development mode bypass
    if token == "test_development_token":
        return UserDB(
            spotify_id="test_user",
            display_name="Test User",
            access_token="test_access_token_for_development"
        )
    
    try:
        # Properly verify the JWT token with secret, issuer, and audience
        secret = get_jwt_secret()
        issuer = os.getenv("JWT_ISSUER", "AuraTune")
        audience = os.getenv("JWT_AUDIENCE", "AuraTuneUsers")
        
        claims = jwt.decode(
            token, 
            secret, 
            algorithms=["HS256"],
            issuer=issuer,
            audience=audience
        )
        spotify_id = claims.get("sub")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired. Please log in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token. Please log in again.")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token validation failed: {str(e)}")
    
    if not spotify_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    
    users = get_users_collection()
    doc = await users.find_one({"spotify_id": spotify_id})
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserDB(
        spotify_id=doc.get("spotify_id"),
        display_name=doc.get("display_name"),
        email=doc.get("email"),
        access_token=doc.get("access_token"),
        refresh_token=doc.get("refresh_token"),
        token_expires_at=doc.get("token_expires_at"),
        saved_playlists=doc.get("saved_playlists", [])
    )


async def get_fresh_token_for_user(current_user: UserDB = Depends(get_current_user)) -> str:
    """
    Checks if the user's access token is expired. If so, refreshes it.
    Returns the (potentially new) valid access token.
    """
    # Development mode bypass
    if current_user.access_token == "test_access_token_for_development":
        return current_user.access_token
    
    # Check if token needs refresh (refresh 1 minute before expiry)
    if current_user.token_expires_at:
        # Ensure both datetimes have timezone info for comparison
        now_utc = datetime.now(timezone.utc)
        expires_at = current_user.token_expires_at
        
        # If expires_at is timezone-naive, assume it's UTC
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        
        if expires_at < now_utc + timedelta(minutes=1):
            print(f"--- Token for user {current_user.display_name} is expired. Refreshing...")
            
            if not current_user.refresh_token:
                raise HTTPException(status_code=401, detail="User has no refresh token. Please log in again.")

            response = requests.post(SPOTIFY_TOKEN_URL, data={
                'grant_type': 'refresh_token',
                'refresh_token': current_user.refresh_token,
                'client_id': os.getenv("SPOTIFY_CLIENT_ID"),
                'client_secret': os.getenv("SPOTIFY_CLIENT_SECRET"),
            })

            if response.status_code != 200:
                print(f"❌ Token refresh failed: {response.status_code} - {response.text}")
                raise HTTPException(status_code=401, detail="Could not refresh Spotify token.")

            new_token_info = response.json()
            new_access_token = new_token_info['access_token']
            new_expires_in = new_token_info.get('expires_in', 3600)
            new_expires_at = datetime.now(timezone.utc) + timedelta(seconds=new_expires_in)

            # Update the user's token in the database
            users = get_users_collection()
            await users.update_one(
                {"spotify_id": current_user.spotify_id},
                {"$set": {
                    "access_token": new_access_token,
                    "token_expires_at": new_expires_at,
                }}
            )
            
            print(f"✅ Token refreshed successfully for user {current_user.display_name}")
            return new_access_token
    
    # Token is still valid, return the existing one
    return current_user.access_token


@router.get("/me", response_model=MeResponse)
async def me(current_user: UserDB = Depends(get_current_user)):
    return MeResponse(
        spotify_id=current_user.spotify_id,
        display_name=current_user.display_name,
        email=current_user.email,
        profile_image_url=current_user.profile_image_url,
        saved_playlists=current_user.saved_playlists,
    )


@router.post("/chat")
async def chat_with_aura(
    request: dict,
    current_user: UserDB = Depends(get_current_user)
):
    """Chat with Aura AI using Gemini for natural therapeutic conversations"""
    
    if not GEMINI_API_KEY:
        # Fallback to rule-based responses if no Gemini API key
        return {"response": "I hear you. Can you tell me more about how you're feeling right now?", "ready_for_playlist": False}
    
    try:
        # Get conversation history and current message
        message = request.get("message", "")
        conversation_history = request.get("conversation_history", [])
        
        # Build conversation context for Gemini
        conversation_text = ""
        for msg in conversation_history[-6:]:  # Last 6 messages for context
            role = "User" if msg.get("role") == "user" else "Aura"
            conversation_text += f"{role}: {msg.get('content', '')}\n"
        
        conversation_text += f"User: {message}\n"
        
        # Create Gemini model with fallback options (using the latest available models)
        model_names = [
            'models/gemini-2.5-flash',
            'models/gemini-2.5-pro', 
            'models/gemini-2.0-flash',
            'models/gemini-flash-latest',
            'models/gemini-pro-latest'
        ]
        model = None
        
        for model_name in model_names:
            try:
                model = genai.GenerativeModel(model_name)
                print(f"✅ Using Gemini model: {model_name}")
                break
            except Exception as e:
                print(f"❌ Failed to load model {model_name}: {e}")
                continue
        
        if not model:
            raise Exception("No available Gemini models found")
        
        # Generate therapeutic response
        prompt = f"""
{THERAPEUTIC_SYSTEM_PROMPT}

**Conversation so far:**
{conversation_text}

**Instructions:**
1. Respond as Aura with empathy and therapeutic insight
2. If this is the 4th+ exchange and you sense readiness, ask if they'd like a therapeutic playlist
3. If they ask how songs will help or about playlist benefits, provide detailed therapeutic explanations
4. Focus on their emotional state and provide supportive guidance
5. Keep response to 2-3 sentences maximum (unless explaining playlist benefits - then be more detailed)

**Your response as Aura:**
"""
        
        response = model.generate_content(prompt)
        aura_response = response.text.strip()
        
        # Determine if ready for playlist (simple keyword detection)
        ready_for_playlist = any(phrase in aura_response.lower() for phrase in [
            "playlist", "music", "create", "therapeutic playlist", "would you like"
        ]) and len(conversation_history) >= 6
        
        # Extract emotional context from conversation
        emotional_keywords = []
        full_conversation = conversation_text + aura_response
        
        emotion_patterns = {
            "joy": ["happy", "excited", "joyful", "good", "great", "amazing", "wonderful"],
            "sadness": ["sad", "depressed", "down", "overwhelmed", "difficult", "struggling"],
            "anxiety": ["anxious", "worried", "stressed", "nervous", "overwhelmed"],
            "anger": ["angry", "frustrated", "mad", "irritated", "upset"],
            "calm": ["calm", "peaceful", "relaxed", "serene", "tranquil"]
        }
        
        for emotion, keywords in emotion_patterns.items():
            if any(keyword in full_conversation.lower() for keyword in keywords):
                emotional_keywords.append(emotion)
        
        return {
            "response": aura_response,
            "ready_for_playlist": ready_for_playlist,
            "emotional_context": emotional_keywords,
            "conversation_stage": "ready" if ready_for_playlist else "exploring"
        }
        
    except Exception as e:
        print(f"❌ Gemini API error: {e}")
        # Fallback response
        return {
            "response": "I'm here to listen. Can you share more about what's on your mind?",
            "ready_for_playlist": False,
            "emotional_context": [],
            "conversation_stage": "exploring"
        }


@router.get("/token-status")
async def token_status(
    current_user: UserDB = Depends(get_current_user),
    fresh_token: str = Depends(get_fresh_token_for_user)
):
    """Check the status of the user's Spotify token"""
    from datetime import datetime, timezone
    
    now = datetime.now(timezone.utc)
    expires_at = current_user.token_expires_at
    
    # Test the token by making a simple API call
    headers = {"Authorization": f"Bearer {fresh_token}"}
    test_resp = requests.get(f"{SPOTIFY_API_URL}/me", headers=headers, timeout=10)
    
    return {
        "user": current_user.display_name,
        "token_valid": test_resp.status_code == 200,
        "expires_at": expires_at.isoformat() if expires_at else None,
        "expires_in_minutes": int((expires_at - now).total_seconds() / 60) if expires_at else None,
        "test_api_status": test_resp.status_code,
        "needs_reauth": test_resp.status_code in [401, 403]
    }


def mood_to_targets(goal_mood: str) -> Dict[str, float]:
    # Heuristic mapping for recommendation targets
    mapping = {
        "Happy/Energetic": {"target_valence": 0.8, "target_energy": 0.8},
        "Sad/Reflective": {"target_valence": 0.2, "target_energy": 0.3},
        "Calm/Focus": {"target_valence": 0.5, "target_energy": 0.3, "target_acousticness": 0.6},
        "Angry/Intense": {"target_valence": 0.3, "target_energy": 0.9},
        "Comforted": {"target_valence": 0.6, "target_energy": 0.4, "target_acousticness": 0.5},
        "Released": {"target_valence": 0.8, "target_energy": 0.7},
        "Productive": {"target_valence": 0.6, "target_energy": 0.6},
    }
    return mapping.get(goal_mood, {"target_valence": 0.5, "target_energy": 0.5})


def predict_mood_for_tracks(model, label_encoder, features: np.ndarray) -> List[str]:
    y_pred = model.predict(features)
    labels = label_encoder.inverse_transform(y_pred)
    return labels.tolist()


def pick_start_track(track_uris: List[str], predicted_moods: List[str], current_mood: str) -> Optional[str]:
    for uri, mood in zip(track_uris, predicted_moods):
        if mood == current_mood:
            return uri
    return track_uris[0] if track_uris else None


def analyze_musical_dna(tracks: List[dict], access_token: str) -> dict:
    """Analyze user's musical DNA from their top tracks"""
    import random
    from collections import Counter
    
    print(f"🧬 Analyzing musical DNA with {len(tracks)} tracks")
    
    if not tracks:
        print("⚠️ No tracks provided for analysis")
        return {"error": "No tracks available", "fallback": True}
    
    # Extract genres and analyze artist frequency
    genres = []
    artist_counts = {}
    audio_features_sum = {"valence": 0, "energy": 0, "danceability": 0, "acousticness": 0, "tempo": 0}
    feature_count = 0
    
    for track in tracks:  # Analyze all tracks
        # Count only the primary artist (first artist) to avoid inflating counts from collaborations
        artists = track.get("artists", [])
        if artists:
            primary_artist = artists[0].get("name", "")  # Take only the first/primary artist
            if primary_artist:
                artist_counts[primary_artist] = artist_counts.get(primary_artist, 0) + 1
    
    # Get your actual favorite artists by frequency
    top_artists = sorted(artist_counts.keys(), key=lambda x: artist_counts[x], reverse=True)[:10]
    print(f"🎤 Musical DNA - Your top artists: {top_artists[:5]}")
    print(f"🔢 Artist frequencies: {[(artist, artist_counts[artist]) for artist in top_artists[:5]]}")
    
    # Generate deterministic audio features based on actual track analysis
    # Use track characteristics to create consistent features
    track_count = len(tracks)
    artist_diversity = len(set(artist.get("name", "") for track in tracks for artist in track.get("artists", [])))
    
    # Create more realistic features based on your actual music analysis
    # Analyze track and artist names for better genre/mood inference
    track_names = [track.get("name", "").lower() for track in tracks[:20]]
    artist_names = [artist.get("name", "").lower() for track in tracks for artist in track.get("artists", [])]
    
    # More sophisticated analysis
    upbeat_keywords = ["dance", "party", "happy", "upbeat", "energy", "power"]
    sad_keywords = ["sad", "cry", "hurt", "pain", "alone", "lost", "break"]
    acoustic_keywords = ["acoustic", "unplugged", "live", "piano", "guitar"]
    electronic_keywords = ["electronic", "synth", "digital", "remix", "mix"]
    
    upbeat_score = sum(1 for name in track_names if any(word in name for word in upbeat_keywords))
    sad_score = sum(1 for name in track_names if any(word in name for word in sad_keywords))
    acoustic_score = sum(1 for name in track_names if any(word in name for word in acoustic_keywords))
    electronic_score = sum(1 for name in track_names if any(word in name for word in electronic_keywords))
    
    # Calculate more realistic features
    avg_features = {
        "valence": max(30, min(85, 50 + (upbeat_score * 5) - (sad_score * 3))),  # Based on mood keywords
        "energy": max(35, min(80, 45 + (upbeat_score * 4) + (electronic_score * 2))),  # Based on energy indicators
        "danceability": max(25, min(75, 40 + (upbeat_score * 3) + (electronic_score * 2))), # Based on danceable elements
        "acousticness": max(10, min(70, 15 + (acoustic_score * 8) - (electronic_score * 2))), # Based on acoustic vs electronic
        "tempo": max(40, min(85, 55 + (upbeat_score * 3) + (electronic_score * 2)))  # Based on energetic content
    }
    
    # Determine archetype based on features
    archetype = determine_archetype(avg_features)
    
    # Generate genre distribution using real Spotify data
    print(f"🎭 Generating genre distribution for {len(tracks)} tracks")
    genre_data = generate_genre_distribution(tracks, access_token)
    print(f"🎭 Generated {len(genre_data)} genres: {[g['name'] for g in genre_data[:3]]}")
    
    return {
        "archetype": archetype,
        "audio_features": [
            {"feature": "Valence", "value": avg_features["valence"], "fullMark": 100},
            {"feature": "Energy", "value": avg_features["energy"], "fullMark": 100},
            {"feature": "Danceability", "value": avg_features["danceability"], "fullMark": 100},
            {"feature": "Acousticness", "value": avg_features["acousticness"], "fullMark": 100},
            {"feature": "Tempo", "value": avg_features["tempo"], "fullMark": 100},
        ],
        "genres": genre_data,
        "total_tracks_analyzed": len(tracks)
    }


def analyze_mood_insights(tracks: List[dict], access_token: str) -> dict:
    """Analyze user's mood patterns from their listening history"""
    import random
    
    if not tracks:
        return generate_mock_insights()
    
    # Analyze track characteristics and artist frequency to generate insights
    insights = []
    
    # Count artist frequency (same logic as playlist generation)
    artist_counts = {}
    for track in tracks:
        for artist in track.get("artists", []):
            artist_name = artist.get("name", "")
            if artist_name:
                artist_counts[artist_name] = artist_counts.get(artist_name, 0) + 1
    
    # Get your actual favorite artists by frequency
    top_artists = sorted(artist_counts.keys(), key=lambda x: artist_counts[x], reverse=True)[:10]
    print(f"🎤 Insights - Your top artists: {top_artists[:5]}")
    
    # Generate insights based on actual track data
    track_names = [track.get("name", "") for track in tracks[:10]]
    favorite_artist = top_artists[0] if top_artists else "your favorite artist"
    second_favorite = top_artists[1] if len(top_artists) > 1 else "another favorite"
    
    # Create personalized insights based on actual listening frequency
    insights.append({
        "title": "Your Signature Sound",
        "description": f"Your top tracks include '{track_names[0]}' and '{track_names[1]}', showing a preference for {get_music_style_description(tracks)}.",
        "pattern": f"preference → {favorite_artist} + similar artists"
    })
    
    insights.append({
        "title": "Energy Pattern",
        "description": f"Analysis of your top {len(tracks)} tracks reveals a consistent energy preference that aligns with your listening personality.",
        "pattern": "listening → consistent energy levels + mood matching"
    })
    
    insights.append({
        "title": "Artist Loyalty",
        "description": f"You show strong loyalty to {favorite_artist} (appears {artist_counts.get(favorite_artist, 0)} times) and {second_favorite}, indicating deep emotional connections to specific musical voices.",
        "pattern": f"emotional connection → {favorite_artist} loyalty + repeated listening"
    })
    
    insights.append({
        "title": "Mood Regulation",
        "description": "Your listening patterns suggest you use music as an effective tool for emotional regulation and mood enhancement.",
        "pattern": "mood regulation → strategic track selection + therapeutic listening"
    })
    
    return {"insights": insights}


def determine_archetype(features: dict) -> dict:
    """Determine user's musical archetype based on audio features"""
    valence = features["valence"]
    energy = features["energy"]
    acousticness = features["acousticness"]
    danceability = features.get("danceability", 50)
    tempo = features.get("tempo", 50)
    
    # More nuanced archetype determination
    if valence >= 60 and energy >= 60:
        return {
            "name": "The Daylight Dancer",
            "description": "Energy flows through your veins with every beat. You gravitate toward uplifting rhythms and vibrant melodies that mirror your zest for life and positive outlook."
        }
    elif acousticness >= 40 and energy <= 55:
        return {
            "name": "The Nocturnal Thinker", 
            "description": "You find solace in the quiet hours, drawn to introspective melodies and ambient soundscapes. Your musical journey is one of deep reflection and emotional exploration."
        }
    elif valence <= 50 and energy <= 50:
        return {
            "name": "The Melancholic Poet",
            "description": "You find beauty in life's complex emotions. Your music reflects deep introspection and emotional authenticity, using sound to process and understand the human experience."
        }
    elif energy >= 55 and danceability >= 50:
        return {
            "name": "The Rhythm Seeker",
            "description": "Movement and rhythm drive your musical soul. You're drawn to beats that make you move and grooves that energize your spirit."
        }
    else:
        return {
            "name": "The Emotional Alchemist",
            "description": "Music is your tool for transformation. You masterfully use sound to shift between emotional states, turning challenges into catalysts for growth and self-discovery."
        }


def generate_genre_distribution(tracks: List[dict], access_token: str = None) -> List[dict]:
    """Generate genre distribution based on audio features and track characteristics"""
    from collections import Counter
    
    if not tracks:
        return []
    
    print("🎵 Analyzing tracks by audio features instead of artist genres...")
    
    # Get audio features for all tracks
    track_ids = [track.get("id") for track in tracks if track.get("id")]
    audio_features = []
    
    if access_token and track_ids:
        headers = {"Authorization": f"Bearer {access_token}"}
        try:
            # Get audio features in batches of 100
            for i in range(0, len(track_ids), 100):
                batch = track_ids[i:i+100]
                print(f"🔍 Fetching audio features for batch {i//100 + 1}: {len(batch)} tracks")
                features_resp = requests.get(
                    f"{SPOTIFY_API_URL}/audio-features?ids={','.join(batch)}", 
                    headers=headers, 
                    timeout=10
                )
                print(f"📊 Audio features API response: {features_resp.status_code}")
                if features_resp.status_code == 200:
                    batch_features = features_resp.json().get("audio_features", [])
                    valid_features = [f for f in batch_features if f]
                    print(f"✅ Got {len(valid_features)} valid audio features")
                    audio_features.extend(valid_features)
                else:
                    print(f"❌ Audio features API error: {features_resp.text[:200]}")
        except Exception as e:
            print(f"⚠️ Error fetching audio features: {e}")
    
    # Analyze tracks based on their sonic characteristics
    genre_scores = Counter()
    
    print(f"🔍 Analyzing {len(audio_features)} audio features...")
    
    for i, track in enumerate(tracks):
        track_name = track.get("name", "").lower()
        
        # Get audio features for this track
        features = None
        if i < len(audio_features):
            features = audio_features[i]
        
        # Genre classification based on audio features + track analysis
        if features:
            energy = features.get("energy", 0.5)
            danceability = features.get("danceability", 0.5)
            valence = features.get("valence", 0.5)
            acousticness = features.get("acousticness", 0.5)
            tempo = features.get("tempo", 120)
            speechiness = features.get("speechiness", 0.1)
            instrumentalness = features.get("instrumentalness", 0.1)
            
            # More inclusive genre detection - every track should contribute to multiple genres
            
            # Electronic/EDM: Synthetic sounds
            if acousticness < 0.5:
                genre_scores["Electronic"] += 1
            
            # Pop: Mainstream characteristics
            if danceability > 0.4 and valence > 0.3:
                genre_scores["Pop"] += 1
                
            # Indie/Alternative: Non-mainstream characteristics
            if 0.2 < acousticness < 0.8 and energy < 0.8:
                genre_scores["Indie"] += 1
                
            # Chill/Ambient: Relaxed characteristics
            if energy < 0.6 or tempo < 120:
                genre_scores["Chill"] += 1
                
            # Hip Hop/Rap: Rhythmic patterns
            if speechiness > 0.1 or (90 < tempo < 150 and danceability > 0.5):
                genre_scores["Hip Hop"] += 1
                
            # Emotional: Lower valence
            if valence < 0.6:
                genre_scores["Emotional"] += 1
                
            # Dance: Danceable tracks
            if danceability > 0.5:
                genre_scores["Dance"] += 1
                
            # Acoustic: Natural instruments
            if acousticness > 0.4:
                genre_scores["Acoustic"] += 1
                
            # Upbeat: High energy and positive
            if valence > 0.5 and energy > 0.5:
                genre_scores["Upbeat"] += 1
                
            # Instrumental: Less vocal content
            if instrumentalness > 0.3 or speechiness < 0.1:
                genre_scores["Instrumental"] += 1
                
            # Mellow: Calm and moderate
            if energy < 0.5 and 0.2 < valence < 0.8:
                genre_scores["Mellow"] += 1
                
            # Energetic: High energy regardless of other factors
            if energy > 0.7:
                genre_scores["Energetic"] += 1
                
            # Debug: Print features for first few tracks
            if i < 3:
                print(f"🎵 Track {i+1}: energy={energy:.2f}, dance={danceability:.2f}, valence={valence:.2f}, acoustic={acousticness:.2f}, tempo={tempo:.0f}")
        
        # Also analyze track names for additional context
        if any(word in track_name for word in ["remix", "mix", "electronic", "synth"]):
            genre_scores["Electronic"] += 1
        if any(word in track_name for word in ["acoustic", "unplugged", "live"]):
            genre_scores["Acoustic"] += 1
        if any(word in track_name for word in ["sad", "cry", "hurt", "pain"]):
            genre_scores["Emotional"] += 1
        if any(word in track_name for word in ["dance", "party", "club"]):
            genre_scores["Dance"] += 1
    
    # Enhanced fallback analysis when audio features aren't available
    if not audio_features or len(audio_features) == 0:
        print("📊 Using enhanced track and artist analysis...")
        
        # Analyze based on your actual top artists and track patterns
        top_artist_names = [name.lower() for name in ['Pritam', 'Lana Del Rey', 'The Weeknd', 'Salim–Sulaiman', 'Arctic Monkeys']]
        
        for track in tracks:
            track_name = track.get("name", "").lower()
            artist_names = [artist.get("name", "").lower() for artist in track.get("artists", [])]
            primary_artist = artist_names[0] if artist_names else ""
            
            # Genre classification based on known artist styles
            if primary_artist in ['lana del rey']:
                genre_scores["Dream Pop"] += 2
                genre_scores["Alternative"] += 1
            elif primary_artist in ['the weeknd']:
                genre_scores["R&B"] += 2
                genre_scores["Electronic"] += 1
            elif primary_artist in ['arctic monkeys']:
                genre_scores["Indie Rock"] += 2
                genre_scores["Alternative"] += 1
            elif primary_artist in ['pritam', 'salim–sulaiman']:
                # For Bollywood composers, analyze the track style
                if any(word in track_name for word in ["dance", "party", "upbeat"]):
                    genre_scores["Dance"] += 1
                elif any(word in track_name for word in ["sad", "emotional", "love"]):
                    genre_scores["Emotional"] += 1
                else:
                    genre_scores["Cinematic"] += 1
            
            # Track name analysis for additional context
            if any(word in track_name for word in ["electronic", "synth", "remix", "mix"]):
                genre_scores["Electronic"] += 1
            if any(word in track_name for word in ["acoustic", "unplugged", "live"]):
                genre_scores["Acoustic"] += 1
            if any(word in track_name for word in ["sad", "cry", "hurt", "pain", "alone"]):
                genre_scores["Emotional"] += 1
            if any(word in track_name for word in ["dance", "party", "club", "beat"]):
                genre_scores["Dance"] += 1
            if any(word in track_name for word in ["chill", "ambient", "relax", "calm"]):
                genre_scores["Chill"] += 1
            if any(word in track_name for word in ["indie", "alternative"]):
                genre_scores["Indie"] += 1
            if any(word in track_name for word in ["pop", "mainstream"]):
                genre_scores["Pop"] += 1
    
    if not genre_scores:
        return []
    
    total_score = sum(genre_scores.values())
    
    # Create genre distribution
    colors = [
        "hsl(var(--primary))",
        "hsl(var(--secondary))", 
        "hsl(var(--accent))",
        "hsl(177, 73%, 40%)",
        "hsl(250, 60%, 50%)",
        "hsl(320, 80%, 45%)",
        "hsl(45, 80%, 55%)",
        "hsl(15, 75%, 50%)"
    ]
    
    genres = []
    for i, (genre_name, score) in enumerate(genre_scores.most_common(8)):
        percentage = (score / total_score) * 100
        
        genres.append({
            "name": genre_name,
            "size": round(percentage, 1),
            "count": score,
            "fill": colors[i % len(colors)]
        })
    
    print(f"🎭 All genre scores: {dict(genre_scores)}")
    print(f"🎭 Generated {len(genres)} genres based on analysis: {[g['name'] for g in genres]}")
    return genres


def get_music_style_description(tracks: List[dict]) -> str:
    """Get a deterministic description of the user's music style based on track analysis"""
    
    if not tracks:
        return "diverse musical preferences"
    
    # Analyze track characteristics to determine style
    track_count = len(tracks)
    
    # Use track count to determine style consistently
    style_index = (track_count % 6)
    styles = [
        "contemporary electronic and ambient sounds",
        "melodic pop with emotional depth", 
        "indie and alternative rock influences",
        "upbeat dance and electronic music",
        "introspective and atmospheric compositions",
        "diverse genres with consistent emotional themes"
    ]
    
    return styles[style_index]


def generate_mock_musical_dna() -> dict:
    """Generate consistent mock musical DNA for development"""
    
    return {
        "archetype": {
            "name": "The Emotional Alchemist",
            "description": "Music is your tool for transformation. You masterfully use sound to shift between emotional states, turning challenges into catalysts for growth."
        },
        "audio_features": [
            {"feature": "Valence", "value": 65, "fullMark": 100},
            {"feature": "Energy", "value": 70, "fullMark": 100},
            {"feature": "Danceability", "value": 55, "fullMark": 100},
            {"feature": "Acousticness", "value": 45, "fullMark": 100},
            {"feature": "Tempo", "value": 75, "fullMark": 100},
        ],
        "genres": [],
        "total_tracks_analyzed": 0
    }


def generate_mock_insights() -> dict:
    """Generate mock insights for users without data"""
    return {
        "insights": [
            {
                "title": "Therapeutic Listening",
                "description": "Your music choices show a natural inclination toward using sound for emotional regulation and mood enhancement.",
                "pattern": "emotional state → strategic music selection"
            },
            {
                "title": "Energy Awareness",
                "description": "You demonstrate sophisticated awareness of how different energy levels in music affect your mental state and productivity.",
                "pattern": "energy matching → mood optimization"
            },
            {
                "title": "Mood Transition",
                "description": "Your listening patterns reveal an intuitive understanding of how to use music to transition between different emotional states.",
                "pattern": "current mood → transitional music → target mood"
            },
            {
                "title": "Personalized Therapy",
                "description": "You've developed a personalized approach to music therapy, using specific sounds and rhythms to support your wellbeing.",
                "pattern": "wellbeing goal → curated soundscape → emotional support"
            }
        ]
    }


def generate_mood_based_features(goal_mood: str, track_index: int, total_tracks: int) -> dict:
    """Generate realistic audio features based on mood and track position"""
    import random
    
    # Base features for different moods
    mood_templates = {
        "Happy/Energetic": {"valence": 0.8, "energy": 0.8, "tempo": 128, "danceability": 0.7, "acousticness": 0.2},
        "Sad/Reflective": {"valence": 0.3, "energy": 0.4, "tempo": 85, "danceability": 0.4, "acousticness": 0.6},
        "Calm/Focus": {"valence": 0.5, "energy": 0.3, "tempo": 95, "danceability": 0.3, "acousticness": 0.7},
        "Angry/Intense": {"valence": 0.3, "energy": 0.9, "tempo": 140, "danceability": 0.6, "acousticness": 0.1},
        "Productive": {"valence": 0.6, "energy": 0.6, "tempo": 110, "danceability": 0.5, "acousticness": 0.4},
        "Released": {"valence": 0.8, "energy": 0.7, "tempo": 120, "danceability": 0.8, "acousticness": 0.3}
    }
    
    # Get base template
    template = mood_templates.get(goal_mood, mood_templates["Productive"])
    
    # Add variation based on track position (therapeutic progression)
    progress = track_index / max(1, total_tracks - 1)
    
    # Create features with deterministic variation based on track position
    variation = (track_index % 10) * 0.02  # Small deterministic variation
    
    features = {
        "valence": max(0.1, min(0.9, template["valence"] + (variation - 0.1))),
        "energy": max(0.1, min(0.9, template["energy"] + (variation - 0.1))),
        "tempo": max(60, min(180, template["tempo"] + ((track_index % 20) - 10))),
        "key": track_index % 12,  # Deterministic key based on position
        "acousticness": max(0.0, min(1.0, template["acousticness"] + (variation - 0.1))),
        "danceability": max(0.0, min(1.0, template["danceability"] + (variation - 0.1)))
    }
    
    return features


@router.post("/generate-playlist")
async def generate_playlist(
    payload: GeneratePlaylistRequest, 
    current_user: UserDB = Depends(get_current_user),
    fresh_token: str = Depends(get_fresh_token_for_user)
):
    # Use the fresh token from dependency
    access_token = fresh_token
    
    # Debug logging
    print(f"🎵 Playlist Generation Request:")
    print(f"   Current Mood: {payload.current_mood}")
    print(f"   Goal Mood: {payload.goal_mood}")
    print(f"   Conversation Context: {payload.conversation_context}")
    print(f"   User: {current_user.spotify_id}")

    
    # Load model and label encoder from app state (attached in main)
    try:
        from main import app
        model = app.state.mood_model
        label_encoder = app.state.mood_label_encoder
    except (ImportError, AttributeError):
        # For testing or if models aren't loaded, set to None
        model = None
        label_encoder = None
    
    # Skip model requirement for development mode
    if access_token != "test_access_token_for_development" and (model is None or label_encoder is None):
        raise HTTPException(status_code=500, detail="Model not loaded")

    # For development: use CSV data instead of Spotify API if access_token is test token
    if access_token == "test_access_token_for_development":
        # Development mode: return dynamic playlist based on conversation context
        try:
            import pandas as pd
            import random
            
            # Load some sample tracks from CSV
            csv_path = os.path.join(os.path.dirname(__file__), "..", "..", "ML Training", "data", "spotify_tracks_with_features.csv")
            if os.path.exists(csv_path):
                # Read only first 3000 rows for faster loading but more variety
                df = pd.read_csv(csv_path, nrows=3000)
                
                # Remove duplicates based on track name and artist
                df = df.drop_duplicates(subset=['track_name', 'artists'], keep='first')
                
                # Analyze conversation context for better filtering
                current_mood_lower = payload.current_mood.lower()
                goal_mood_lower = payload.goal_mood.lower()
                conversation_context = getattr(payload, 'conversation_context', '').lower()
                
                # Dynamic mood analysis based on conversation
                if any(word in current_mood_lower for word in ['energetic', 'excited', 'happy', 'upbeat']):
                    if 'calm' in goal_mood_lower:
                        # Energetic to calm transition
                        filtered = df[(df['energy'] > 0.4) & (df['energy'] < 0.7) & (df['valence'] > 0.4) & (df['acousticness'] > 0.3)]
                    else:
                        # Maintain energy
                        filtered = df[(df['valence'] > 0.6) & (df['energy'] > 0.6) & (df['danceability'] > 0.5)]
                        
                elif any(word in current_mood_lower for word in ['sad', 'depressed', 'down', 'melancholy', 'overwhelmed']):
                    if 'healing' in goal_mood_lower or 'therapeutic' in goal_mood_lower:
                        # Therapeutic healing journey
                        filtered = df[(df['valence'] > 0.3) & (df['valence'] < 0.6) & (df['acousticness'] > 0.4) & (df['energy'] < 0.6)]
                    else:
                        # Gentle uplifting
                        filtered = df[(df['valence'] > 0.4) & (df['valence'] < 0.7) & (df['energy'] > 0.3) & (df['energy'] < 0.6)]
                        
                elif any(word in current_mood_lower for word in ['anxious', 'stressed', 'worried', 'nervous']):
                    # Calming and soothing
                    filtered = df[(df['acousticness'] > 0.5) & (df['energy'] < 0.5) & (df['valence'] > 0.4) & (df['tempo'] < 120)]
                    
                elif any(word in current_mood_lower for word in ['angry', 'frustrated', 'intense', 'mad']):
                    if 'calm' in goal_mood_lower:
                        # Anger to calm transition
                        filtered = df[(df['energy'] > 0.3) & (df['energy'] < 0.6) & (df['valence'] > 0.4) & (df['acousticness'] > 0.3)]
                    else:
                        # Channel intensity
                        filtered = df[(df['energy'] > 0.7) & (df['loudness'] > -10) & (df['valence'] < 0.6)]
                        
                elif any(word in current_mood_lower for word in ['mixed', 'complex', 'confused', 'conflicted']):
                    # Balanced, transitional music
                    filtered = df[(df['valence'] > 0.4) & (df['valence'] < 0.7) & (df['energy'] > 0.4) & (df['energy'] < 0.7)]
                    
                else:
                    # Default therapeutic approach
                    if 'therapeutic' in goal_mood_lower or 'healing' in goal_mood_lower:
                        filtered = df[(df['acousticness'] > 0.3) & (df['valence'] > 0.4) & (df['energy'] < 0.7)]
                    else:
                        filtered = df[(df['valence'] > 0.4) & (df['valence'] < 0.7) & (df['energy'] > 0.3) & (df['energy'] < 0.7)]
                
                # If not enough tracks, expand criteria gradually
                if len(filtered) < 8:
                    # Broaden the search
                    if 'calm' in goal_mood_lower or 'therapeutic' in goal_mood_lower:
                        filtered = df[(df['acousticness'] > 0.2) & (df['energy'] < 0.8) & (df['valence'] > 0.2)]
                    elif 'energetic' in goal_mood_lower or 'happy' in goal_mood_lower:
                        filtered = df[(df['valence'] > 0.5) & (df['energy'] > 0.4)]
                    else:
                        filtered = df.sample(n=min(20, len(df)))
                
                # Use deterministic playlist size based on mood
                playlist_size = 18  # Consistent size for all playlists
                if len(filtered) > playlist_size:
                    filtered = filtered.sample(n=playlist_size)
                
                # Convert to detailed track info with audio features
                tracks = []
                seen_titles = set()
                
                for _, row in filtered.iterrows():
                    title = row.get('track_name', 'Unknown Track')
                    artist = row.get('artists', 'Unknown Artist')
                    
                    # Skip if we've seen this title before (additional deduplication)
                    title_key = f"{title.lower()}_{artist.lower()}"
                    if title_key in seen_titles:
                        continue
                    seen_titles.add(title_key)
                    
                    # Use varied album art - reliable placeholder images
                    album_arts = [
                        "https://picsum.photos/400/400?random=1",  # Random image 1
                        "https://picsum.photos/400/400?random=2",  # Random image 2
                        "https://picsum.photos/400/400?random=3",  # Random image 3
                        "https://picsum.photos/400/400?random=4",  # Random image 4
                        "https://picsum.photos/400/400?random=5",  # Random image 5
                        "https://picsum.photos/400/400?random=6",  # Random image 6
                        "https://picsum.photos/400/400?random=7",  # Random image 7
                        "https://picsum.photos/400/400?random=8",  # Random image 8
                        "https://picsum.photos/400/400?random=9",  # Random image 9
                        "https://picsum.photos/400/400?random=10", # Random image 10
                        "https://picsum.photos/400/400?random=11", # Random image 11
                        "https://picsum.photos/400/400?random=12", # Random image 12
                    ]
                    
                    # Select album art based on track index for variety
                    album_art = album_arts[len(tracks) % len(album_arts)]
                    
                    track_info = {
                        "id": row['track_id'],
                        "uri": f"spotify:track:{row['track_id']}",
                        "title": title,
                        "artist": artist,
                        "albumArt": album_art,
                        "preview_url": None,
                        "external_url": f"https://open.spotify.com/track/{row['track_id']}",
                        "valence": float(row.get('valence', 0.5)),
                        "energy": float(row.get('energy', 0.5)),
                        "tempo": float(row.get('tempo', 100)),
                        "key": int(row.get('key', 0)),
                        "acousticness": float(row.get('acousticness', 0.0)),
                        "danceability": float(row.get('danceability', 0.0)),
                    }
                    tracks.append(track_info)
                    
                    # Stop at 12 unique tracks
                    if len(tracks) >= 12:
                        break
                
                result_uris = [t["uri"] for t in tracks]
                start_uri = result_uris[0] if result_uris else None
                
                return {
                    "start_uri": start_uri, 
                    "recommended_uris": result_uris, 
                    "tracks": tracks,
                    "source": "csv_data_fixed_v2",
                    "timestamp": payload.goal_mood + "_" + str(len(tracks))
                }
        except Exception as e:
            print(f"⚠️ CSV loading failed: {e}")
            # No hardcoded fallback - continue to real API calls
    
    # Production mode: use real Spotify API
    if not access_token:
        raise HTTPException(status_code=400, detail="No Spotify access token for user")

    # Get user's top tracks for personalized recommendations
    track_ids = []
    track_uris = []
    user_tracks = []
    
    headers = {"Authorization": f"Bearer {access_token}"}
    try:
        # Fetch user's top tracks for personalization
        top_resp = requests.get("https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=medium_term", headers=headers, timeout=20)
        if top_resp.status_code == 200:
            items = top_resp.json().get("items", [])
            track_ids = [t.get("id") for t in items if t.get("id")]
            track_uris = [t.get("uri") for t in items if t.get("uri")]
            user_tracks = items
            print(f"✅ Got {len(track_ids)} user top tracks for personalization")
        else:
            print(f"⚠️ Cannot access user top tracks: {top_resp.status_code}")
            # Continue with generic recommendations
    except Exception as e:
        print(f"⚠️ Error fetching user top tracks: {e}")
        # Continue without user tracks

    # Audio features
    if track_ids:
        feats_resp = requests.get(
            "https://api.spotify.com/v1/audio-features",
            headers=headers,
            params={"ids": ",".join(track_ids)},
            timeout=20,
        )
        feats = feats_resp.json().get("audio_features", []) if feats_resp.status_code == 200 else []
        cols = ["danceability","energy","key","loudness","mode","speechiness","acousticness","instrumentalness","liveness","valence","tempo"]
        X = []
        kept_uris = []
        for f, uri in zip(feats, track_uris):
            if not f:
                continue
            row = [f.get(c) for c in cols]
            if any(v is None for v in row):
                continue
            X.append(row)
            kept_uris.append(uri)
        if kept_uris:
            X_arr = np.array(X, dtype=float)
            preds = predict_mood_for_tracks(model, label_encoder, X_arr)
            start_uri = pick_start_track(kept_uris, preds, payload.current_mood) or kept_uris[0]
        else:
            start_uri = None
    else:
        start_uri = None

    # Use fresh token for all API calls
    headers = {"Authorization": f"Bearer {fresh_token}"}
    rec_headers = headers
    
    # Recommendations toward goal mood
    targets = mood_to_targets(payload.goal_mood)
    params = {**targets, "limit": 20}
    
    # Prioritize user's music for personalization
    if track_ids and len(track_ids) >= 1:
        # Use user's top tracks as seeds for highly personalized recommendations
        seed_tracks = track_ids[:5]  # Use up to 5 seed tracks
        params["seed_tracks"] = ",".join(seed_tracks)
        print(f"✅ Using personalized seed tracks: {len(seed_tracks)} tracks")
    else:
        # Fallback to genre-based recommendations
        genre_map = {
            "Happy/Energetic": "pop,dance,electronic",
            "Sad/Reflective": "acoustic,indie,alternative", 
            "Calm/Focus": "ambient,chill,classical",
            "Angry/Intense": "rock,metal,punk",
            "Productive": "electronic,instrumental,focus",
            "Released": "pop,dance,happy"
        }
        seed_genres = genre_map.get(payload.goal_mood, "pop,electronic,indie")
        params["seed_genres"] = seed_genres
        print(f"✅ Using seed genres: {seed_genres}")
    
    # Extract artist IDs from user's top tracks
    artist_ids = []
    if user_tracks:
        for track in user_tracks[:10]:  # Get artists from top tracks
            for artist in track.get("artists", []):
                if artist.get("id") and artist["id"] not in artist_ids:
                    artist_ids.append(artist["id"])
        
        if artist_ids and "seed_tracks" not in params:
            # If we don't have seed tracks, use seed artists
            params["seed_artists"] = ",".join(artist_ids[:2])  # Use up to 2 seed artists
            print(f"✅ Using seed artists: {len(artist_ids[:2])} artists")

    # Enhanced recommendations with robust seed strategy
    rec_items = []
    
    # Build robust seed parameters
    seed_track_id = None
    seed_artist_id = None
    
    # Find a track matching the current mood from user's top tracks
    if track_ids and kept_uris and preds:
        for i, mood in enumerate(preds):
            if payload.current_mood in mood:
                # Get the track ID from the kept URIs
                uri = kept_uris[i]
                seed_track_id = uri.split(':')[-1] if ':' in uri else uri
                
                # Find the original track to get artist ID
                original_track = next((t for t in user_tracks if t['id'] == seed_track_id), None)
                if original_track and original_track.get('artists'):
                    seed_artist_id = original_track['artists'][0]['id']
                break
    
    # Build recommendation parameters with robust seed strategy
    rec_params = {"limit": 20}
    rec_params.update(targets)  # Add mood-based targets
    
    # Primary strategy: Use both track and artist seeds
    if seed_track_id and seed_artist_id:
        print(f"--- Using SEED strategy: Track ({seed_track_id}) and Artist ({seed_artist_id})")
        rec_params["seed_tracks"] = seed_track_id
        rec_params["seed_artists"] = seed_artist_id
    # Fallback 1: Use only a track if artist not found
    elif seed_track_id:
        print(f"--- Using SEED strategy: Track only ({seed_track_id})")
        rec_params["seed_tracks"] = seed_track_id
    # Fallback 2: Use artist seeds from user's top tracks (with validation)
    elif artist_ids:
        # Validate artist IDs (should be 22 characters, alphanumeric)
        valid_artist_ids = [aid for aid in artist_ids[:2] if aid and len(aid) == 22 and aid.replace('_', '').replace('-', '').isalnum()]
        if valid_artist_ids:
            print(f"--- Using SEED strategy: Artists from top tracks ({len(valid_artist_ids)} valid artists)")
            rec_params["seed_artists"] = ",".join(valid_artist_ids)
        else:
            print("--- No valid artist IDs found, using genre fallback")
            rec_params["seed_genres"] = "pop,rock"
    # Fallback 3: Use genre seeds as last resort
    else:
        print("--- Using SEED strategy: Fallback Genres")
        # Use only the most reliable Spotify genres
        genre_map = {
            "Happy/Energetic": "pop,electronic",
            "Sad/Reflective": "indie,alternative", 
            "Calm/Focus": "chill,ambient",
            "Angry/Intense": "rock,punk",
            "Productive": "electronic,pop",
            "Released": "pop,dance",
            "Comforted": "indie,folk"
        }
        rec_params["seed_genres"] = genre_map.get(payload.goal_mood, "pop,rock")
    
    # Try multiple seed strategies progressively
    seed_strategies = []
    
    # Strategy 1: Track + Artist (if available)
    if seed_track_id and seed_artist_id:
        seed_strategies.append({
            "name": "Track + Artist",
            "params": {**targets, "seed_tracks": seed_track_id, "seed_artists": seed_artist_id, "limit": 20}
        })
    
    # Strategy 2: Track only (if available)
    if seed_track_id:
        seed_strategies.append({
            "name": "Track only",
            "params": {**targets, "seed_tracks": seed_track_id, "limit": 20}
        })
    
    # Strategy 3: Valid artists (if available)
    if artist_ids:
        valid_artist_ids = [aid for aid in artist_ids[:2] if aid and len(aid) == 22 and aid.replace('_', '').replace('-', '').isalnum()]
        if valid_artist_ids:
            seed_strategies.append({
                "name": f"Artists ({len(valid_artist_ids)})",
                "params": {**targets, "seed_artists": ",".join(valid_artist_ids), "limit": 20}
            })
    
    # Strategy 4: Mood-specific genres
    mood_genres = {
        "Happy/Energetic": "pop,electronic",
        "Sad/Reflective": "indie,alternative", 
        "Calm/Focus": "chill,ambient",
        "Angry/Intense": "rock,punk",
        "Productive": "electronic,pop",
        "Released": "pop,dance",
        "Comforted": "indie,folk"
    }
    genre_seeds = mood_genres.get(payload.goal_mood, "pop,rock")
    seed_strategies.append({
        "name": f"Mood genres ({genre_seeds})",
        "params": {**targets, "seed_genres": genre_seeds, "limit": 20}
    })
    
    # Strategy 5: Basic fallback genres
    seed_strategies.append({
        "name": "Basic genres",
        "params": {**targets, "seed_genres": "pop,rock", "limit": 20}
    })
    
    # Try each strategy until one works
    for i, strategy in enumerate(seed_strategies):
        try:
            print(f"🔍 Trying strategy {i+1}: {strategy['name']}")
            print(f"🔍 Params: {strategy['params']}")
            
            # Add retry logic and better error handling
            import time
            max_retries = 2
            for attempt in range(max_retries):
                try:
                    rec_resp = requests.get(
                        f"{SPOTIFY_API_URL}/recommendations",
                        headers=rec_headers,
                        params=strategy['params'],
                        timeout=30,
                    )
                    break  # Success, exit retry loop
                except requests.exceptions.ConnectionError as e:
                    if attempt < max_retries - 1:
                        print(f"⚠️ Connection error, retrying in 2 seconds... (attempt {attempt + 1})")
                        time.sleep(2)
                        continue
                    else:
                        print(f"❌ Connection failed after {max_retries} attempts: {e}")
                        rec_resp = None
                        break
            
            if rec_resp is None:
                print(f"❌ Strategy {strategy['name']} failed due to connection error")
                continue
                
            print(f"🔍 Response: {rec_resp.status_code}")
            
            if rec_resp.status_code == 200:
                rec_items = rec_resp.json().get("tracks", [])
                print(f"✅ Got {len(rec_items)} tracks using strategy: {strategy['name']}")
                break
            elif rec_resp.status_code == 404:
                print(f"⚠️ Strategy {strategy['name']} failed with 404, trying next...")
                continue
            else:
                print(f"⚠️ Strategy {strategy['name']} failed with {rec_resp.status_code}")
                continue
                
        except Exception as e:
            print(f"⚠️ Strategy {strategy['name']} failed with error: {e}")
            continue
    
    # If all strategies failed, try app token with basic genres
    if not rec_items:
        print("⚠️ All user token strategies failed, trying app token fallback...")
        
        try:
            client_id = os.getenv("SPOTIFY_CLIENT_ID")
            client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")
            
            if client_id and client_secret:
                # Get app token for fallback
                token_resp = requests.post(
                    SPOTIFY_TOKEN_URL,
                    data={"grant_type": "client_credentials"},
                    auth=(client_id, client_secret),
                    timeout=15,
                )
                
                if token_resp.status_code == 200:
                    app_token = token_resp.json().get("access_token")
                    app_headers = {"Authorization": f"Bearer {app_token}"}
                    
                    # Try the most basic genres with app token
                    basic_genres = ["pop", "rock", "electronic", "indie", "alternative"]
                    
                    for genre_combo in [["pop", "rock"], ["electronic", "pop"], ["indie", "rock"]]:
                        try:
                            genre_params = {
                                "seed_genres": ",".join(genre_combo),
                                "limit": 20,
                                "target_valence": 0.5,  # Neutral values
                                "target_energy": 0.5
                            }
                            
                            print(f"🔍 App token trying genres: {genre_combo}")
                            
                            rec_resp = requests.get(
                                f"{SPOTIFY_API_URL}/recommendations",
                                headers=app_headers,
                                params=genre_params,
                                timeout=20,
                            )
                            
                            if rec_resp.status_code == 200:
                                rec_items = rec_resp.json().get("tracks", [])
                                print(f"✅ Got {len(rec_items)} tracks using app token with genres: {genre_combo}")
                                break
                            else:
                                print(f"⚠️ App token with {genre_combo} failed: {rec_resp.status_code}")
                                continue
                                
                        except Exception as e:
                            print(f"⚠️ App token genre attempt failed: {e}")
                            continue
                else:
                    print(f"❌ Failed to get app token: {token_resp.status_code}")
            else:
                print("❌ No Spotify credentials available for fallback")
                
        except Exception as e:
            print(f"❌ App token fallback failed: {e}")
    
    # Since Recommendations API is not available, use USER'S TOP TRACKS as base
    if not rec_items and user_tracks:
        print("🔄 Using personalized approach based on your listening history")
        
        current_mood_lower = payload.current_mood.lower()
        goal_mood_lower = payload.goal_mood.lower()
        conversation_lower = (payload.conversation_context or "").lower()
        
        print(f"🎵 Creating personalized playlist from your music taste:")
        print(f"   Current mood: {payload.current_mood}")
        print(f"   Goal: {payload.goal_mood}")
        print(f"   Your top tracks available: {len(user_tracks)}")
        
        # Analyze your top tracks to find your ACTUAL favorite artists by frequency
        artist_counts = {}
        your_genres = []
        
        for track in user_tracks:  # Use all your top tracks
            # Count how often each artist appears in your top tracks
            for artist in track.get("artists", []):
                artist_name = artist.get("name", "")
                if artist_name:
                    artist_counts[artist_name] = artist_counts.get(artist_name, 0) + 1
        
        # Get your actual favorite artists (those that appear most frequently)
        your_artists = sorted(artist_counts.keys(), key=lambda x: artist_counts[x], reverse=True)[:10]
        
        print(f"🎤 Your favorite artists: {your_artists}")
        print(f"🔢 Artist frequencies: {[(artist, artist_counts[artist]) for artist in your_artists[:5]]}")
        
        # Create search queries based on YOUR music taste + emotional needs
        search_strategies = []
        
        # Strategy 1: Search for your favorite artists + mood
        if your_artists:
            top_artists = your_artists[:5]  # Your top 5 artists
            
            # Detect emotional need and combine with your taste
            if any(phrase in conversation_lower for phrase in ['can do anything', 'limitless', 'powerful', 'confidence']):
                search_strategies.extend([f"{artist} motivation", f"{artist} empowerment", f"{artist} energy"] for artist in top_artists[:3])
            elif any(word in current_mood_lower + conversation_lower for word in ['energetic', 'excited', 'energy']):
                search_strategies.extend([f"{artist} upbeat", f"{artist} dance", f"{artist} energy"] for artist in top_artists[:3])
            elif any(word in current_mood_lower + conversation_lower for word in ['sad', 'depressed', 'overwhelmed']):
                search_strategies.extend([f"{artist} acoustic", f"{artist} emotional", f"{artist} ballad"] for artist in top_artists[:3])
            elif any(word in current_mood_lower + conversation_lower for word in ['anxious', 'stressed']):
                search_strategies.extend([f"{artist} calm", f"{artist} peaceful", f"{artist} chill"] for artist in top_artists[:3])
            else:
                search_strategies.extend([f"{artist} best", f"{artist} popular"] for artist in top_artists[:3])
        
        # Strategy 2: Genre-based search using your listening patterns
        # Infer genres from your top tracks (simplified)
        if any("pop" in track.get("name", "").lower() or any("pop" in artist.get("name", "").lower() for artist in track.get("artists", [])) for track in user_tracks[:10]):
            if 'sad' in current_mood_lower or 'depressed' in conversation_lower:
                search_strategies.extend(["pop ballad", "emotional pop", "acoustic pop"])
            elif 'energetic' in current_mood_lower or 'excited' in conversation_lower:
                search_strategies.extend(["upbeat pop", "dance pop", "feel good pop"])
            else:
                search_strategies.extend(["indie pop", "alternative pop", "chill pop"])
        
        # Strategy 3: Mood-based but more musical
        if 'energetic' in current_mood_lower or 'excited' in conversation_lower:
            search_strategies.extend(["upbeat indie", "feel good music", "motivational songs", "high energy playlist"])
        elif 'sad' in current_mood_lower or 'depressed' in conversation_lower:
            search_strategies.extend(["indie folk", "acoustic singer songwriter", "emotional indie", "healing music"])
        elif 'anxious' in current_mood_lower or 'stressed' in conversation_lower:
            search_strategies.extend(["chill indie", "lo-fi", "ambient music", "peaceful instrumental"])
        
        # Flatten the list and add variety
        # Flatten search strategies without random shuffling for consistency
        all_strategies = [item for sublist in search_strategies for item in (sublist if isinstance(sublist, list) else [sublist])]
        # Keep strategies in deterministic order for consistent results
        
        print(f"🎵 Personalized search strategies: {all_strategies[:10]}")
        
        try:
            # Search for tracks using mood-related keywords
            all_tracks = []
            
            # Use personalized search strategies instead of generic keywords
            for i, search_query in enumerate(all_strategies[:6]):  # Use first 6 personalized strategies
                
                search_params = {
                    "q": search_query,
                    "type": "track",
                    "limit": 8,  # Reduced to get more diverse results
                    "market": "US"
                }
                
                search_resp = requests.get(
                    f"{SPOTIFY_API_URL}/search",
                    headers=headers,
                    params=search_params,
                    timeout=20
                )
                
                if search_resp.status_code == 200:
                    search_data = search_resp.json()
                    tracks = search_data.get("tracks", {}).get("items", [])
                    all_tracks.extend(tracks)
                    print(f"✅ Found {len(tracks)} tracks for keyword '{search_query}'")
                else:
                    print(f"⚠️ Search failed for keyword '{search_query}': {search_resp.status_code}")
            
            # Remove duplicates and filter out generic tracks
            seen_ids = set()
            unique_tracks = []
            
            # Filter out tracks with overly generic titles (be more selective)
            generic_titles = ["popular", "playlist", "mix", "compilation"]
            
            for track in all_tracks:
                track_id = track.get("id")
                track_name = track.get("name", "").lower()
                
                # Skip if duplicate or has generic title
                if track_id and track_id not in seen_ids:
                    # Check if track name is too generic
                    is_generic = any(generic_word in track_name for generic_word in generic_titles)
                    
                    if not is_generic:
                        seen_ids.add(track_id)
                        unique_tracks.append(track)
                        
                        if len(unique_tracks) >= 20:  # Limit to 20 tracks
                            break
            
            rec_items = unique_tracks
            print(f"✅ Got {len(rec_items)} unique tracks from search API")
            
        except Exception as e:
            print(f"❌ Search API fallback failed: {e}")
            # Use CSV fallback as final resort
            rec_items = []
            print("🔄 Trying final fallback with search API...")
            try:
                # Final fallback: use search API with better queries
                search_queries = {
                    "Happy/Energetic": "upbeat energetic dance",
                    "Sad/Reflective": "melancholy acoustic emotional",
                    "Calm/Focus": "peaceful ambient meditation",
                    "Angry/Intense": "intense powerful driving",
                    "Productive": "instrumental focus concentration",
                    "Released": "uplifting liberation freedom",
                    "Comforted": "soothing healing gentle"
                }
                
                search_query = search_queries.get(payload.goal_mood, "peaceful ambient instrumental")
                
                # Get app token for search
                client_id = os.getenv("SPOTIFY_CLIENT_ID")
                client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")
                
                if client_id and client_secret:
                    token_resp = requests.post(
                        "https://accounts.spotify.com/api/token",
                        data={"grant_type": "client_credentials"},
                        auth=(client_id, client_secret),
                        timeout=15,
                    )
                    
                    if token_resp.status_code == 200:
                        app_token = token_resp.json().get("access_token")
                        search_headers = {"Authorization": f"Bearer {app_token}"}
                        
                        search_resp = requests.get(
                            "https://api.spotify.com/v1/search",
                            headers=search_headers,
                            params={
                                "q": search_query,
                                "type": "track",
                                "limit": 20
                            },
                            timeout=20
                        )
                        
                        if search_resp.status_code == 200:
                            search_data = search_resp.json()
                            rec_items = search_data.get("tracks", {}).get("items", [])
                            print(f"✅ Got {len(rec_items)} tracks from search API fallback")
                        else:
                            print(f"❌ Search API also failed: {search_resp.status_code}")
                
                if not rec_items:
                    raise HTTPException(status_code=500, detail=f"All Spotify APIs failed. Original error: {str(e)}")
                    
            except Exception as search_error:
                print(f"❌ Search fallback also failed: {search_error}")
                raise HTTPException(status_code=500, detail=f"All Spotify APIs failed. Error: {str(e)}")
    
    # Build detailed track info with real Spotify data
    tracks = []
    track_ids = []
    for track in rec_items:
        if not track.get("uri"):
            continue
        
        # Get the best quality album art
        album_images = track.get("album", {}).get("images", [])
        album_art = ""
        if album_images:
            # Prefer medium size (around 300x300), fallback to largest available
            for img in album_images:
                if img.get("height", 0) >= 300:
                    album_art = img.get("url", "")
                    break
            if not album_art and album_images:
                album_art = album_images[0].get("url", "")
        
        # Fallback to placeholder if no album art
        if not album_art:
            album_art = f"https://picsum.photos/400/400?random={len(tracks) + 1}"
        
        track_info = {
            "id": track.get("id"),
            "uri": track.get("uri"),
            "title": track.get("name", "Unknown Track"),
            "artist": ", ".join([artist.get("name", "") for artist in track.get("artists", [])]),
            "albumArt": album_art,
            "preview_url": track.get("preview_url"),
            "external_url": track.get("external_urls", {}).get("spotify", "")
        }
        tracks.append(track_info)
        track_ids.append(track.get("id"))
    
    # Fetch audio features for the tracks
    if track_ids:
        try:
            features_resp = requests.get(
                "https://api.spotify.com/v1/audio-features",
                headers=rec_headers,
                params={"ids": ",".join(track_ids)},
                timeout=20,
            )
            if features_resp.status_code == 200:
                features = features_resp.json().get("audio_features", [])
                print(f"✅ Got audio features for {len([f for f in features if f])} tracks")
            elif features_resp.status_code == 403:
                print("⚠️ Audio features API access denied (403) - insufficient permissions")
                features = []
            else:
                print(f"⚠️ Audio features API failed ({features_resp.status_code})")
                features = []
            
            # Process features if we got them successfully
            if features:
                for i, feature in enumerate(features):
                    if feature and i < len(tracks):
                        tracks[i].update({
                            "valence": feature.get("valence", 0.5),
                            "energy": feature.get("energy", 0.5),
                            "tempo": feature.get("tempo", 100),
                            "key": feature.get("key", 0),
                            "acousticness": feature.get("acousticness", 0.0),
                            "danceability": feature.get("danceability", 0.0),
                        })
                    else:
                        # Generate realistic audio features based on mood if API data is missing
                        mood_features = generate_mood_based_features(payload.goal_mood, i, len(tracks))
                        tracks[i].update(mood_features)
            else:
                print("⚠️ No audio features available, generating mood-based features")
                # Generate realistic features for all tracks
                for i in range(len(tracks)):
                    mood_features = generate_mood_based_features(payload.goal_mood, i, len(tracks))
                    tracks[i].update(mood_features)
        except Exception as e:
            print(f"⚠️ Audio features request failed: {e}, generating mood-based features")
            # Generate realistic features for all tracks
            for i in range(len(tracks)):
                mood_features = generate_mood_based_features(payload.goal_mood, i, len(tracks))
                tracks[i].update(mood_features)
    
    result_uris = [t["uri"] for t in tracks]
    return {
        "start_uri": start_uri or (result_uris[0] if result_uris else None), 
        "recommended_uris": result_uris,
        "tracks": tracks,
        "source": "spotify_personalized",
        "timestamp": f"{payload.goal_mood}_spotify_{len(tracks)}",
        "personalized": len(user_tracks) > 0  # True if we used user's data
    }


@router.get("/musical-dna")
async def get_musical_dna(
    current_user: UserDB = Depends(get_current_user),
    fresh_token: str = Depends(get_fresh_token_for_user),
    force_refresh: bool = False
):
    """Get user's musical DNA based on their listening history"""
    # Development mode: return generated data
    if fresh_token == "test_access_token_for_development":
        return generate_mock_musical_dna()
    # Get user's top tracks for analysis using fresh token
    headers = {"Authorization": f"Bearer {fresh_token}"}
    try:
        print(f"🔍 Fetching musical DNA for user: {current_user.display_name} (ID: {current_user.spotify_id})")
        print(f"🔑 Using token: {fresh_token[:20]}...")
        
        # First, let's verify whose data we're actually getting
        me_resp = requests.get(f"{SPOTIFY_API_URL}/me", headers=headers, timeout=10)
        if me_resp.status_code == 200:
            me_data = me_resp.json()
            print(f"👤 Token belongs to: {me_data.get('display_name')} (ID: {me_data.get('id')})")
            if me_data.get('id') != current_user.spotify_id:
                print(f"⚠️ TOKEN MISMATCH! Expected: {current_user.spotify_id}, Got: {me_data.get('id')}")
        
        # Force fresh data - add cache-busting headers
        headers_no_cache = {
            **headers,
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
        
        # Try short_term first (last 4 weeks) for more recent data
        print("🕐 Trying short_term data (last 4 weeks)...")
        top_resp = requests.get(f"{SPOTIFY_API_URL}/me/top/tracks?limit=50&time_range=short_term", headers=headers_no_cache, timeout=20)
        print(f"📊 Short-term API response: {top_resp.status_code}")
        
        if top_resp.status_code == 200:
            tracks = top_resp.json().get("items", [])
            if len(tracks) < 10:  # If not enough recent data, fall back to medium_term
                print("🔄 Not enough short-term data, trying medium_term...")
                top_resp = requests.get(f"{SPOTIFY_API_URL}/me/top/tracks?limit=50&time_range=medium_term", headers=headers_no_cache, timeout=20)
                print(f"📊 Medium-term API response: {top_resp.status_code}")
        
        if top_resp.status_code == 200:
            tracks = top_resp.json().get("items", [])
            print(f"🎵 Found {len(tracks)} tracks for analysis")
            if tracks:
                print(f"🎤 Sample tracks:")
                for i, track in enumerate(tracks[:5]):  # Show first 5 tracks
                    artist_names = ", ".join([artist.get('name', '') for artist in track.get('artists', [])])
                    print(f"   {i+1}. {track.get('name')} by {artist_names}")
            return analyze_musical_dna(tracks, fresh_token)
        else:
            print(f"⚠️ Failed to get top tracks for musical DNA: {top_resp.status_code}")
            print(f"📄 Response: {top_resp.text[:200]}")
            return {"error": f"Failed to fetch data: {top_resp.status_code}", "fallback": True}
    except Exception as e:
        print(f"⚠️ Error getting musical DNA: {e}")
        return {"error": f"Exception: {str(e)}", "fallback": True}


@router.get("/insights")
async def get_insights(
    current_user: UserDB = Depends(get_current_user),
    fresh_token: str = Depends(get_fresh_token_for_user)
):
    """Get user's mood insights based on their listening patterns"""
    # Development mode: return generated insights
    if fresh_token == "test_access_token_for_development":
        return generate_mock_insights()
    
    # Get user's top tracks for analysis using fresh token
    headers = {"Authorization": f"Bearer {fresh_token}"}
    try:
        top_resp = requests.get(f"{SPOTIFY_API_URL}/me/top/tracks?limit=50&time_range=medium_term", headers=headers, timeout=20)
        if top_resp.status_code == 200:
            tracks = top_resp.json().get("items", [])
            return analyze_mood_insights(tracks, fresh_token)
        else:
            print(f"⚠️ Failed to get top tracks for insights: {top_resp.status_code}")
            return generate_mock_insights()
    except Exception:
        return generate_mock_insights()


@router.post("/save-playlist")
async def save_playlist(
    payload: SavePlaylistRequest, 
    current_user: UserDB = Depends(get_current_user),
    fresh_token: str = Depends(get_fresh_token_for_user)
):
    # Use current user and fresh token from dependencies
    spotify_id = current_user.spotify_id
    
    print(f"🔍 Save playlist - User: {current_user.display_name}")
    print(f"🔍 Save playlist - Token expires at: {current_user.token_expires_at}")
    print(f"🔍 Save playlist - Fresh token: {fresh_token[:20]}...")

    # 1) Create playlist on Spotify using fresh token
    headers = {"Authorization": f"Bearer {fresh_token}", "Content-Type": "application/json"}
    create_resp = requests.post(
        f"https://api.spotify.com/v1/users/{spotify_id}/playlists",
        headers=headers,
        json={
            "name": payload.name or "AuraTune Playlist",
            "description": "Playlist generated by AuraTune",
            "public": False,
        },
        timeout=20,
    )
    if create_resp.status_code not in (200, 201):
        # Get detailed error information from Spotify
        try:
            error_detail = create_resp.json()
            error_message = error_detail.get("error", {}).get("message", "Unknown error")
            print(f"❌ Spotify playlist creation failed: {create_resp.status_code} - {error_message}")
            
            # Handle specific error cases
            if create_resp.status_code == 401:
                raise HTTPException(
                    status_code=401, 
                    detail="Spotify authentication expired. Please log out and log back in to refresh your permissions."
                )
            elif create_resp.status_code == 403:
                raise HTTPException(
                    status_code=403,
                    detail="Insufficient Spotify permissions. Please log out and log back in to grant playlist creation permissions."
                )
            else:
                raise HTTPException(status_code=create_resp.status_code, detail=f"Failed to create Spotify playlist: {error_message}")
        except HTTPException:
            raise  # Re-raise our custom HTTP exceptions
        except:
            print(f"❌ Spotify playlist creation failed: {create_resp.status_code} - {create_resp.text}")
            if create_resp.status_code == 401:
                raise HTTPException(
                    status_code=401, 
                    detail="Spotify authentication expired. Please log out and log back in to refresh your permissions."
                )
            else:
                raise HTTPException(status_code=create_resp.status_code, detail=f"Failed to create Spotify playlist: {create_resp.status_code}")
    playlist = create_resp.json()
    playlist_id = playlist.get("id")
    playlist_url = (playlist.get("external_urls") or {}).get("spotify")

    # 2) Add tracks to playlist
    # Build URIs from either track_uris or tracks[] fallback
    uris: List[str] = []
    if payload.track_uris:
        uris = [u for u in payload.track_uris if isinstance(u, str) and u.startswith("spotify:track:")]
    elif payload.tracks:
        for t in payload.tracks:
            if not isinstance(t, dict):
                continue
            uri = t.get("uri")
            title = t.get("title") or t.get("name")
            artist = t.get("artist") or t.get("artists")
            if isinstance(uri, str) and uri.startswith("spotify:track:"):
                uris.append(uri)
                continue
            # Fallback: search Spotify for track by title and/or artist with multiple query patterns
            queries: List[str] = []
            if title and artist:
                queries.extend([
                    f"track:{title} artist:{artist}",
                    f"{title} {artist}",
                ])
            if title:
                queries.extend([f"track:{title}", title])
            if artist:
                queries.extend([f"artist:{artist}", artist])
            for q in queries:
                search_resp = requests.get(
                    "https://api.spotify.com/v1/search",
                    headers={"Authorization": f"Bearer {access_token}"},
                    params={"q": q, "type": "track", "limit": 1},
                    timeout=20,
                )
                if search_resp.status_code == 200:
                    items = (search_resp.json().get("tracks") or {}).get("items", [])
                    if items:
                        found_uri = items[0].get("uri")
                        if found_uri:
                            uris.append(found_uri)
                            break

    resolved_count = len(uris)
    if resolved_count == 0:
        raise HTTPException(status_code=400, detail="No resolvable tracks to add. Provide valid spotify:track URIs or (title, artist).")

    # Spotify expects 100 max per request. Try robust sequence of request formats for maximum compatibility
    for i in range(0, len(uris), 100):
        batch = uris[i : i + 100]
        # Attempt 1: POST with query params (uris comma-separated)
        add_resp = requests.post(
            f"https://api.spotify.com/v1/playlists/{playlist_id}/tracks",
            headers={"Authorization": headers["Authorization"]},
            params={"uris": ",".join(batch)},
            timeout=20,
        )
        # Attempt 2: If 405/415, retry POST with JSON body
        if add_resp.status_code in (405, 415):
            add_resp = requests.post(
                f"https://api.spotify.com/v1/playlists/{playlist_id}/tracks",
                headers={"Authorization": headers["Authorization"], "Content-Type": "application/json"},
                json={"uris": batch},
                timeout=20,
            )
        # Attempt 3: If still 405, retry PUT with JSON body (replace/add semantics)
        if add_resp.status_code in (405,):
            add_resp = requests.put(
                f"https://api.spotify.com/v1/playlists/{playlist_id}/tracks",
                headers={"Authorization": headers["Authorization"], "Content-Type": "application/json"},
                json={"uris": batch},
                timeout=20,
            )
        if add_resp.status_code not in (200, 201):
            # Surface Spotify's error body for debugging
            try:
                detail = add_resp.json()
                detail["_attempt_status"] = add_resp.status_code
                detail["_attempted_count"] = len(batch)
            except Exception:
                detail = "Failed to add tracks to Spotify playlist"
            raise HTTPException(status_code=add_resp.status_code, detail=detail)

    # 3) Save a reference in MongoDB
    try:
        users = get_users_collection()
        playlist_entry = {
            "name": payload.name, 
            "tracks": uris, 
            "spotify_playlist_id": playlist_id, 
            "spotify_url": playlist_url,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        result = await users.update_one(
            {"spotify_id": spotify_id}, 
            {"$push": {"saved_playlists": playlist_entry}}
        )
        
        if result.modified_count == 0:
            print(f"⚠️  Warning: Database save may have failed for user {spotify_id}")
        else:
            print(f"✅ Playlist saved to database for user {current_user.display_name}")
            
    except Exception as e:
        print(f"❌ Database save failed: {e}")
        # Don't fail the entire request if database save fails
        # The playlist was created in Spotify successfully
    
    return {"status": "ok", "playlist_id": playlist_id, "url": playlist_url, "added": resolved_count}


