import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { emotions, goals, Song } from "@/data/mockData";
import { useUser } from "@/contexts/UserContext";

interface Message {
  role: "assistant" | "user";
  content: string;
  options?: Array<{ id: string; label: string }>;
}

interface ChatInterfaceProps {
  onPlaylistGenerated: (playlist: Song[], moodTransition?: { from: string; to: string }) => void;
  onReset?: () => void;
}

const ChatInterface = ({ onPlaylistGenerated, onReset }: ChatInterfaceProps) => {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: user 
        ? `Hello ${user.name}, I'm Aura, your AI music therapist. I'm here to listen and help you explore your emotions through music. There's no rush - we can take this conversation wherever you need it to go. What's on your mind today?`
        : "Hello, I'm Aura, your AI music therapist. I'm here to create a safe space where we can explore your emotions together through the power of music. What's been weighing on your heart lately?",
    },
  ]);
  const [conversationStage, setConversationStage] = useState<'initial' | 'exploring' | 'deepening' | 'ready'>('initial');
  const [userInput, setUserInput] = useState('');
  const [emotionalContext, setEmotionalContext] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // Therapeutic conversation prompts for different stages
  const therapeuticPrompts = {
    exploring: [
      "That sounds really challenging. Can you tell me more about what that feels like for you?",
      "I hear you. What's been the most difficult part about this situation?",
      "It takes courage to share that. How long have you been carrying these feelings?",
      "Thank you for trusting me with this. What would help you feel more supported right now?",
      "I can sense there's a lot going on for you. What's been your biggest source of stress lately?",
    ],
    deepening: [
      "It sounds like you're dealing with multiple layers of emotions. That's completely normal and valid.",
      "I'm noticing some complex feelings here. Sometimes music can help us process what words can't express.",
      "You've shared so much with me. What kind of emotional journey would feel most healing for you right now?",
      "I can hear the strength in your voice, even through the struggle. What would emotional relief look like for you?",
      "Thank you for being so open. Let's create something that honors where you are and where you want to go.",
    ]
  };

  const resetChat = () => {
    setMessages([
      {
        role: "assistant",
        content: user 
          ? `Hello ${user.name}, I'm Aura, your AI music therapist. I'm here to listen and help you explore your emotions through music. There's no rush - we can take this conversation wherever you need it to go. What's on your mind today?`
          : "Hello, I'm Aura, your AI music therapist. I'm here to create a safe space where we can explore your emotions together through the power of music. What's been weighing on your heart lately?",
      },
    ]);
    setConversationStage('initial');
    setUserInput('');
    setEmotionalContext([]);
    setIsGenerating(false);
    setIsTyping(false);
    onReset?.();
  };

  // Reset chat when component mounts or user changes
  useEffect(() => {
    resetChat();
  }, [user]);

  const handleUserMessage = async (message: string) => {
    if (!message.trim()) return;

    // Add user message
    const newMessages = [...messages, { role: "user", content: message }];
    setMessages(newMessages);
    setUserInput('');
    setIsTyping(true);

    try {
      // Call Gemini-powered chat endpoint
      const backend = (import.meta as any).env?.VITE_BACKEND_URL || "http://127.0.0.1:8000";
      const token = localStorage.getItem("auratune_token") || "test_development_token";
      
      const response = await fetch(`${backend}/user/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: message,
          conversation_history: newMessages
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update emotional context
        if (data.emotional_context && data.emotional_context.length > 0) {
          setEmotionalContext(prev => {
            const newContext = [...prev];
            data.emotional_context.forEach(emotion => {
              if (!newContext.includes(emotion)) {
                newContext.push(emotion);
              }
            });
            return newContext;
          });
        }
        
        // Update conversation stage
        setConversationStage(data.conversation_stage || 'exploring');
        
        // Add AI response
        const aiMessage = {
          role: "assistant" as const,
          content: data.response,
          options: data.ready_for_playlist ? [
            { id: 'create_playlist', label: 'Yes, create my therapeutic playlist' },
            { id: 'continue_talking', label: 'I\'d like to talk more first' }
          ] : undefined
        };
        
        setMessages(prev => [...prev, aiMessage]);
        
      } else {
        // Fallback to original logic
        await processTherapeuticResponse(message);
      }
    } catch (error) {
      console.error('Chat API error:', error);
      // Fallback to original logic
      await processTherapeuticResponse(message);
    } finally {
      setIsTyping(false);
    }
  };

  const processTherapeuticResponse = async (userMessage: string) => {
    const lowerMessage = userMessage.toLowerCase();
    
    // Enhanced emotional context detection
    const emotionalKeywords = {
      joy: ['happy', 'excited', 'joyful', 'elated', 'cheerful', 'content', 'good', 'great', 'amazing', 'wonderful', 'fantastic', 'perfect'],
      anxiety: ['anxious', 'worried', 'nervous', 'panic', 'stress', 'overwhelmed', 'tense'],
      sadness: ['sad', 'depressed', 'down', 'lonely', 'empty', 'hopeless', 'blue', 'melancholy'],
      anger: ['angry', 'frustrated', 'mad', 'irritated', 'furious', 'annoyed', 'upset'],
      confusion: ['confused', 'lost', 'uncertain', 'mixed', 'conflicted', 'unsure'],
      grief: ['grief', 'loss', 'mourning', 'heartbroken', 'devastated'],
      hope: ['hope', 'optimistic', 'better', 'healing', 'recovery', 'growth'],
      calm: ['calm', 'peaceful', 'relaxed', 'serene', 'tranquil', 'zen']
    };

    // Detect current emotional state
    let detectedEmotion = null;
    Object.entries(emotionalKeywords).forEach(([emotion, keywords]) => {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        detectedEmotion = emotion;
        if (!emotionalContext.includes(emotion)) {
          setEmotionalContext(prev => [...prev, emotion]);
        }
      }
    });

    let response = "";
    let newStage = conversationStage;

    // Dynamic responses based on detected emotion
    if (conversationStage === 'initial') {
      if (detectedEmotion === 'joy') {
        response = "That's wonderful to hear! It sounds like you're in a really positive space right now. What's been contributing to these good feelings?";
      } else if (detectedEmotion === 'sadness') {
        response = "I can hear that you're going through a difficult time. Thank you for sharing that with me. What's been weighing on your heart?";
      } else if (detectedEmotion === 'anxiety') {
        response = "It sounds like you're feeling quite overwhelmed right now. That takes courage to acknowledge. What's been your biggest source of stress lately?";
      } else if (detectedEmotion === 'anger') {
        response = "I can sense there's some frustration there. Those feelings are completely valid. What's been triggering these intense emotions?";
      } else {
        response = therapeuticPrompts.exploring[Math.floor(Math.random() * therapeuticPrompts.exploring.length)];
      }
      newStage = 'exploring';
    } else if (conversationStage === 'exploring') {
      if (messages.length >= 4) {
        if (detectedEmotion === 'joy') {
          response = "I love hearing about this positive energy you have! Since you're feeling so good, would you like music that maintains this wonderful mood, or perhaps something that could help you savor and deepen these positive feelings?";
        } else if (detectedEmotion === 'sadness') {
          response = "Thank you for being so open about your struggles. Music can be incredibly healing during difficult times. What kind of emotional journey would feel most supportive for you right now?";
        } else {
          response = therapeuticPrompts.deepening[Math.floor(Math.random() * therapeuticPrompts.deepening.length)];
        }
        newStage = 'deepening';
      } else {
        if (detectedEmotion === 'joy') {
          response = "That's beautiful! What's been the highlight of this positive experience for you?";
        } else if (detectedEmotion === 'sadness') {
          response = "I hear the pain in what you're sharing. You're not alone in this. Can you tell me more about what support would feel most helpful?";
        } else {
          response = therapeuticPrompts.exploring[Math.floor(Math.random() * therapeuticPrompts.exploring.length)];
        }
      }
    } else if (conversationStage === 'deepening') {
      if (messages.length >= 6) {
        if (detectedEmotion === 'joy') {
          response = "Your positive energy is truly inspiring! I'd love to create a playlist that celebrates and enhances these wonderful feelings you're experiencing. Shall we create some uplifting music to match your mood?";
        } else if (detectedEmotion === 'sadness') {
          response = "You've shared so much with me, and I can feel the depth of what you're going through. Would you like me to create a therapeutic playlist that can provide comfort and gently guide you toward healing?";
        } else {
          response = "I feel like I have a good understanding of your emotional landscape. Would you like me to create a personalized playlist that honors where you are and supports where you want to go?";
        }
        newStage = 'ready';
      } else {
        response = therapeuticPrompts.deepening[Math.floor(Math.random() * therapeuticPrompts.deepening.length)];
      }
    }

    setConversationStage(newStage);
    setMessages(prev => [...prev, { 
      role: "assistant", 
      content: response,
      options: newStage === 'ready' ? [
        { id: 'create_playlist', label: 'Yes, create my therapeutic playlist' },
        { id: 'continue_talking', label: 'I\'d like to talk more first' }
      ] : undefined
    }]);
  };

  const handleOptionSelect = async (optionId: string, optionLabel: string) => {
    setMessages(prev => [...prev, { role: "user", content: optionLabel }]);

    if (optionId === 'create_playlist') {
      await generatePlaylist();
    } else if (optionId === 'continue_talking') {
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Of course, I'm here to listen. Take all the time you need. What else would you like to share?"
      }]);
      setConversationStage('deepening');
    }
  };

  const generatePlaylist = async () => {
    setMessages(prev => [...prev, { 
      role: "assistant", 
      content: "Thank you for sharing your journey with me. I'm now creating a personalized therapeutic playlist that honors your emotional complexity and supports your healing process. This may take a moment..."
    }]);

    setIsGenerating(true);

    try {
      const backend = (import.meta as any).env?.VITE_BACKEND_URL || "http://127.0.0.1:8000";
      
      // Use real JWT token for authentic Spotify integration
      const token = localStorage.getItem("auratune_token") || "test_development_token";
      
      const url = `${backend}/user/generate-playlist`;
      // Create a rich emotional profile from the conversation
      const emotionalProfile = emotionalContext.join(', ') || 'mixed emotions';
      const conversationSummary = messages
        .filter(m => m.role === 'user')
        .map(m => m.content)
        .join(' ');
      
      const payload = { 
        current_mood: emotionalProfile, 
        goal_mood: "therapeutic healing and emotional processing",
        conversation_context: conversationSummary,
        timestamp: Date.now()
      };
      
      // Debug logging
      console.log("🔍 Debug Info:");
      console.log("Backend URL:", backend);
      console.log("Full URL:", url);
      console.log("Token:", token.substring(0, 20) + "...");
      console.log("Payload:", payload);
      
      let resp = await fetch(url, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        },
        body: JSON.stringify(payload),
        cache: "no-store"
      });
      
      // If we get a 404 with JWT token, try with development token
      if (!resp.ok && resp.status === 404 && token !== "test_development_token") {
        console.log("🔄 JWT request failed with 404, trying with development token...");
        resp = await fetch(url, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": "Bearer test_development_token"
          },
          body: JSON.stringify(payload)
        });
        
        if (resp.ok) {
          console.log("✅ Development token request succeeded!");
        } else {
          console.log(`❌ Development token request also failed: ${resp.status}`);
        }
      }
      
      if (!resp.ok) {
        throw new Error(`${resp.status}`);
      }
      const data = await resp.json() as { 
        start_uri: string; 
        recommended_uris: string[];
        tracks?: Array<{
          id: string;
          uri: string;
          title: string;
          artist: string;
          albumArt: string;
          preview_url?: string;
          external_url: string;
          valence?: number;
          energy?: number;
          tempo?: number;
          key?: number;
          acousticness?: number;
          danceability?: number;
        }>;
      };
      
      // Debug: Log the actual response data
      console.log("🎵 API Response Data:", data);
      console.log("🎵 Data Source:", (data as any).source || "unknown");
      console.log("🎵 Timestamp:", (data as any).timestamp || "none");
      console.log("🎵 Number of tracks:", data.tracks?.length || 0);
      if (data.tracks && data.tracks.length > 0) {
        console.log("🎵 First few tracks:");
        data.tracks.slice(0, 3).forEach((track, i) => {
          console.log(`  ${i + 1}. "${track.title}" by ${track.artist}`);
        });
      }
      
      // Use detailed track data if available, otherwise fallback to URIs
      let playlist: Song[];
      if (data.tracks && data.tracks.length > 0) {
        playlist = data.tracks.map((track) => ({
          id: track.id,
          uri: track.uri,
          title: track.title,
          artist: track.artist,
          albumArt: track.albumArt || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=400&fit=crop",
          trackUrl: track.preview_url || track.external_url || "",
          valence: track.valence ?? 0.5,
          energy: track.energy ?? 0.5,
          tempo: track.tempo ?? Math.floor(Math.random() * 60) + 90, // 90-150 BPM if no data
          key: track.key !== undefined ? `${['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][track.key] || 'C'}` : "",
          acousticness: track.acousticness ?? 0.0,
          danceability: track.danceability ?? 0.0,
        }));
      } else {
        // Fallback to URI-based approach
        const allUris = [data.start_uri, ...(data.recommended_uris || [])].filter(Boolean);
        playlist = allUris.map((uri, idx) => ({
          id: uri.split(":").pop() || `track-${idx}`,
          uri: uri,
          title: `Track ${idx + 1}`,
          artist: "Unknown Artist",
          albumArt: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=400&fit=crop",
          trackUrl: "",
          valence: 0.5,
          energy: 0.5,
          tempo: 100,
          key: "",
          acousticness: 0.0,
          danceability: 0.0,
        }));
      }
      // Pass mood transition info along with playlist
      const moodTransition = {
        from: emotionalProfile,
        to: "therapeutic healing and emotional processing"
      };
      onPlaylistGenerated(playlist, moodTransition);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Your personalized playlist is ready! I've curated these tracks to help you transition smoothly. Enjoy your journey.",
        },
      ]);
    } catch (e) {
      console.error('Playlist generation error:', e);
      console.error('Error details:', {
        message: e instanceof Error ? e.message : 'Unknown error',
        stack: e instanceof Error ? e.stack : 'No stack trace',
        type: typeof e
      });
      
      let errorMessage = "Sorry, I couldn't generate a playlist right now. Please try again.";
      
      // Check if it's a CORS or network error
      if (e instanceof Error && (e.message.includes('Failed to fetch') || e.message.includes('CORS'))) {
        errorMessage = "Connection issue detected. This might be a browser cache problem. Try refreshing the page (Ctrl+F5) or clearing your browser cache.";
      } else if (e instanceof Error && e.message === "401") {
        errorMessage = "I need you to connect with Spotify first to generate personalized playlists. Please click the 'Connect with Spotify' button to get started.";
      } else if (e instanceof Error && e.message === "404") {
        errorMessage = "The playlist service is temporarily unavailable. Please try again in a moment. (Debug: Check browser console for details)";
      }
      
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: errorMessage },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent-cyan via-accent-purple to-accent-pink flex items-center justify-center neon-glow pulse-glow">
            <div className="w-8 h-8 rounded-full bg-white/40 sparkle-effect"></div>
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-accent-green rounded-full border-2 border-card flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full pulse-glow"></div>
          </div>
        </div>
        <div>
          <h3 className="text-2xl font-bold gradient-text">🤖 Aura AI</h3>
          <p className="text-lg text-accent-cyan">✨ Your Personal Music Therapist</p>
        </div>
        <div className="ml-auto">
          <div className="music-bars">
            <div className="music-bar"></div>
            <div className="music-bar"></div>
            <div className="music-bar"></div>
          </div>
        </div>
      </div>

      <div className="space-y-6 mb-8 max-h-[500px] overflow-y-auto">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} float-animation`} style={{animationDelay: `${index * 0.1}s`}}>
            <div
              className={`max-w-[85%] rounded-2xl px-6 py-4 ${
                message.role === "user"
                  ? "glass-card neon-glow bg-gradient-to-r from-accent-cyan to-accent-purple text-white"
                  : "glass-card interactive-hover bg-gradient-to-r from-card/80 to-muted/60 text-foreground border border-accent-cyan/30"
              }`}
            >
              <p className="text-base leading-relaxed">{message.content}</p>
              {message.options && (
                <div className="flex flex-wrap gap-3 mt-4">
                  {message.options.map((option, optionIndex) => (
                    <button
                      key={option.id}
                      onClick={() => handleOptionSelect(option.id, option.label)}
                      className="glass-card interactive-hover neon-glow px-4 py-2 text-sm font-medium border border-accent-purple/30 hover:border-accent-pink/50 transition-all duration-300 group"
                      style={{animationDelay: `${optionIndex * 0.1}s`}}
                    >
                      <span className="gradient-text group-hover:scale-110 transition-transform duration-300">
                        {option.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="glass-card neon-glow rounded-2xl px-6 py-4 border border-accent-purple/30">
              <div className="flex items-center gap-3">
                <div className="loading-dots">
                  <div className="loading-dot"></div>
                  <div className="loading-dot"></div>
                  <div className="loading-dot"></div>
                </div>
                <span className="text-accent-purple font-medium">🤖 Aura is thinking...</span>
              </div>
            </div>
          </div>
        )}

        {isGenerating && (
          <div className="flex justify-start">
            <div className="glass-card neon-glow pulse-glow rounded-2xl px-6 py-4 border border-accent-cyan/30">
              <div className="flex items-center gap-3">
                <div className="loading-dots">
                  <div className="loading-dot"></div>
                  <div className="loading-dot"></div>
                  <div className="loading-dot"></div>
                </div>
                <span className="text-accent-cyan font-medium">🎵 Crafting your therapeutic playlist...</span>
                <div className="music-bars ml-2">
                  <div className="music-bar"></div>
                  <div className="music-bar"></div>
                  <div className="music-bar"></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Text Input Area - Always visible for free-form conversation */}
      {!isGenerating && (
        <div className="mb-6">
          <div className="glass-card neon-glow p-4 border border-accent-cyan/30">
            <div className="flex gap-4">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleUserMessage(userInput)}
                placeholder="Share what's on your mind... I'm here to listen 💙"
                className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-foreground/60 text-lg"
                disabled={isTyping}
              />
              <button
                onClick={() => handleUserMessage(userInput)}
                disabled={!userInput.trim() || isTyping}
                className="btn-vibrant px-6 py-2 text-sm"
              >
                {isTyping ? (
                  <div className="loading-spinner w-4 h-4"></div>
                ) : (
                  <>💬 Share</>
                )}
              </button>
            </div>
          </div>
          
          {/* Emotional Context Display */}
          {emotionalContext.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-sm text-foreground/70">Emotions we're exploring:</span>
              {emotionalContext.map((emotion, index) => (
                <span
                  key={emotion}
                  className="px-3 py-1 bg-accent-purple/20 text-accent-purple rounded-full text-sm font-medium border border-accent-purple/30"
                  style={{animationDelay: `${index * 0.1}s`}}
                >
                  {emotion}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Start Over Button - Show only if conversation has progressed beyond initial message */}
      {messages.length > 1 && (
        <div className="flex justify-center pt-6 border-t border-gradient-to-r from-accent-cyan/30 via-accent-purple/30 to-accent-pink/30">
          <button
            onClick={resetChat}
            className="glass-card interactive-hover neon-glow px-6 py-3 border border-accent-orange/30 hover:border-accent-yellow/50 transition-all duration-300 group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500 text-accent-orange">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                  <path d="M21 3v5h-5"/>
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                  <path d="M3 21v-5h5"/>
                </svg>
              </div>
              <span className="font-bold gradient-text">🔄 Start New Session</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
