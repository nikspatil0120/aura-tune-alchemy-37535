import os
import time
import base64
import logging
from typing import Optional
from datetime import datetime, timedelta, timezone

import requests
import urllib3
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from fastapi import APIRouter, Depends, HTTPException, Response, status
import urllib.parse
from fastapi.responses import RedirectResponse
from jose import jwt

from database import get_users_collection
from schemas import TokenResponse

# Set up logging
logger = logging.getLogger(__name__)


router = APIRouter(prefix="/auth", tags=["auth"])


SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize"
SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"
SPOTIFY_ME_URL = "https://api.spotify.com/v1/me"


def _create_robust_session():
    """Create a requests session with robust retry and error handling"""
    session = requests.Session()
    
    # Disable SSL warnings for development
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    
    # Configure retry strategy
    retry_strategy = Retry(
        total=3,
        backoff_factor=1,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["HEAD", "GET", "POST", "OPTIONS"]
    )
    
    # Mount adapter with retry strategy
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    
    # Set headers to prevent connection issues
    session.headers.update({
        'User-Agent': 'AuraTune/1.0',
        'Connection': 'close'  # Prevent connection reuse issues
    })
    
    return session


def _get_oauth_params():
    client_id = os.getenv("SPOTIFY_CLIENT_ID")
    client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")
    # Use environment variable or default to 127.0.0.1
    redirect_uri = os.getenv("SPOTIFY_REDIRECT_URI", "http://127.0.0.1:8000/auth/callback")
    if not client_id or not client_secret:
        raise HTTPException(status_code=500, detail="Spotify credentials not configured")
    return client_id, client_secret, redirect_uri


def _encode_basic(client_id: str, client_secret: str) -> str:
    raw = f"{client_id}:{client_secret}".encode("ascii")
    return base64.b64encode(raw).decode("ascii")


def _make_jwt(payload: dict) -> str:
    secret = os.getenv("JWT_SECRET", "dev-secret")
    issuer = os.getenv("JWT_ISSUER", "AuraTune")
    audience = os.getenv("JWT_AUDIENCE", "AuraTuneUsers")
    payload = {
        **payload,
        "iss": issuer,
        "aud": audience,
        "iat": int(time.time()),
        "exp": int(time.time()) + 60 * 60 * 24 * 7,  # 7 days
    }
    return jwt.encode(payload, secret, algorithm="HS256")


@router.get("/login/spotify")
async def login_spotify():
    logger.info("🚀 Spotify login endpoint called")
    
    client_id, _, redirect_uri = _get_oauth_params()
    
    # Debug logging to see what redirect_uri is being used
    logger.info(f"🔍 Using client_id: {client_id}")
    logger.info(f"🔍 Using redirect_uri: {redirect_uri}")
    
    scope = "user-read-email user-top-read playlist-modify-private playlist-modify-public user-library-read user-read-playback-state user-read-recently-played"
    params = {
        "client_id": client_id,
        "response_type": "code",
        "redirect_uri": redirect_uri,
        "scope": scope,
    }
    # Properly encode reserved characters (including '/') in redirect_uri
    query = urllib.parse.urlencode(params, quote_via=urllib.parse.quote)
    auth_url = f"{SPOTIFY_AUTH_URL}?{query}"
    logger.info(f"🔍 Full auth URL: {auth_url}")
    logger.info(f"� Rtedirect URI being sent: {redirect_uri}")
    logger.info("🔄 Returning redirect response to Spotify")
    return RedirectResponse(url=auth_url, status_code=302)


@router.get("/callback")
async def spotify_callback(code: Optional[str] = None):
    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")

    logger.info(f"OAuth callback received with code: {code[:20]}...")
    
    client_id, client_secret, redirect_uri = _get_oauth_params()
    basic = _encode_basic(client_id, client_secret)
    
    logger.info(f"Using client_id: {client_id}")
    logger.info(f"Using redirect_uri: {redirect_uri}")
    logger.info(f"Using basic auth: {basic[:20]}...")
    
    session = _create_robust_session()
    
    # Debug the token request
    token_data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri,
    }
    logger.info(f"Token request data: {token_data}")
    
    try:
        token_resp = session.post(
            SPOTIFY_TOKEN_URL,
            headers={
                "Authorization": f"Basic {basic}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data=token_data,
            timeout=30,
        )
        logger.info(f"Token response status: {token_resp.status_code}")
        logger.info(f"Token response headers: {dict(token_resp.headers)}")
        logger.info(f"Token response body: {token_resp.text}")
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Network error during token exchange: {str(e)}")
    finally:
        session.close()
    if token_resp.status_code != 200:
        try:
            error_data = token_resp.json()
            error_msg = f"Token exchange failed: {error_data.get('error', 'Unknown error')}"
            if 'error_description' in error_data:
                error_msg += f" - {error_data['error_description']}"
            logger.error(f"Spotify token exchange failed: {error_msg}")
            logger.error(f"Response body: {token_resp.text}")
        except:
            error_msg = f"Token exchange failed: HTTP {token_resp.status_code}"
            logger.error(f"Spotify token exchange failed: {error_msg}")
        raise HTTPException(status_code=token_resp.status_code, detail=error_msg)
    tokens = token_resp.json()
    access_token = tokens.get("access_token")
    refresh_token = tokens.get("refresh_token")
    expires_in = tokens.get("expires_in", 3600)  # Default to 1 hour if not provided
    
    # Calculate token expiry time
    token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
    
    if not access_token:
        raise HTTPException(status_code=500, detail="No access token from Spotify")

    session = _create_robust_session()
    try:
        profile = session.get(
            SPOTIFY_ME_URL,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=30,
        )
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Network error fetching profile: {str(e)}")
    finally:
        session.close()
    if profile.status_code != 200:
        raise HTTPException(status_code=profile.status_code, detail="Failed to fetch profile")
    user = profile.json()
    
    # Debug: Log the full user data to see what Spotify returns
    logger.info(f"🔍 Full Spotify user data: {user}")
    logger.info(f"🔍 Images in user data: {user.get('images', 'No images key found')}")

    users = get_users_collection()
    
    # Check if user already exists to preserve saved playlists
    existing_user = await users.find_one({"spotify_id": user.get("id")})
    
    # Extract profile image URL with multiple fallbacks
    profile_image_url = None
    images = user.get("images", [])
    
    if images and len(images) > 0:
        # Try to get the best quality image
        # Spotify usually provides images in descending order of size
        for img in images:
            if img.get("url"):
                profile_image_url = img.get("url")
                logger.info(f"🖼️ Profile image found: {profile_image_url}")
                break
    
    # If no Spotify image, try to generate a Gravatar or use initials
    if not profile_image_url:
        logger.info(f"🖼️ No profile image in Spotify data. Images array: {images}")
        # You could add Gravatar support here if you have email
        if user.get("email"):
            import hashlib
            email_hash = hashlib.md5(user.get("email").lower().encode()).hexdigest()
            gravatar_url = f"https://www.gravatar.com/avatar/{email_hash}?s=200&d=identicon"
            profile_image_url = gravatar_url
            logger.info(f"🖼️ Using Gravatar fallback: {profile_image_url}")
        else:
            logger.info(f"🖼️ No email available for Gravatar, will use initials")
    
    doc = {
        "spotify_id": user.get("id"),
        "display_name": user.get("display_name"),
        "email": user.get("email"),
        "profile_image_url": profile_image_url,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_expires_at": token_expires_at,
    }
    
    # Only set saved_playlists to empty array if this is a new user
    if not existing_user:
        doc["saved_playlists"] = []
    
    await users.update_one({"spotify_id": doc["spotify_id"]}, {"$set": doc}, upsert=True)

    token = _make_jwt({"sub": doc["spotify_id"]})
    # Redirect back to frontend with token - force 127.0.0.1
    frontend = "http://127.0.0.1:8080"
    redirect_to = f"{frontend}/auth/callback?token={token}"
    resp = RedirectResponse(url=redirect_to, status_code=302)
    # Optionally also set a cookie for convenience (frontend may choose to read it)
    resp.set_cookie(
        key="auratune_token",
        value=token,
        httponly=False,
        samesite="Lax",
        secure=False,
        max_age=60 * 60 * 24 * 7,
        path="/",
    )
    return resp


