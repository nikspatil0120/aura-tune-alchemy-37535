import { useEffect, useState } from "react";
import ChatInterface from "@/components/ChatInterface";
import PlaylistView from "@/components/PlaylistView";
import MusicPlayer from "@/components/MusicPlayer";
import { Song } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

const STORAGE_KEY = "auratune_session_playlist";

const Generator = () => {
  const [generatedPlaylist, setGeneratedPlaylist] = useState<Song[]>([]);
  const [moodTransition, setMoodTransition] = useState<{ from: string; to: string } | null>(null);
  const [isPlayerVisible, setIsPlayerVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // Clear any cached playlist on component mount to ensure fresh start
  useEffect(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Removed automatic loading of cached playlists to prevent showing old results
  // useEffect(() => {
  //   try {
  //     const raw = localStorage.getItem(STORAGE_KEY);
  //     if (raw) setGeneratedPlaylist(JSON.parse(raw));
  //   } catch {}
  // }, []);

  useEffect(() => {
    try {
      if (generatedPlaylist.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(generatedPlaylist));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
  }, [generatedPlaylist]);

  const handlePlaylistGenerated = (playlist: Song[], transition?: { from: string; to: string }) => {
    setGeneratedPlaylist(playlist);
    setMoodTransition(transition || null);
  };

  const handlePlayAll = () => {
    setIsPlayerVisible(true);
  };

  const handleReset = () => {
    setGeneratedPlaylist([]);
    setMoodTransition(null);
    setIsPlayerVisible(false);
    localStorage.removeItem(STORAGE_KEY); // Clear stored playlist
  };

  const handleSave = async () => {
    if (!generatedPlaylist.length) return;
    try {
      setSaving(true);
      
      // Create descriptive playlist name with mood transition
      const playlistName = moodTransition 
        ? `Therapeutic Playlist (${moodTransition.from} → ${moodTransition.to})`
        : "Therapeutic Playlist";
      
      // Show loading toast
      toast.loading(`Saving "${playlistName}" to your Spotify library...`, {
        id: "save-playlist"
      });
      
      const backend = (import.meta as any).env?.VITE_BACKEND_URL || "http://127.0.0.1:8000";
      const trackUris = generatedPlaylist.map((s) => s.uri || s.id);
      
      const res = await apiFetch(`${backend}/user/save-playlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: playlistName, track_uris: trackUris }),
      });
      
      if (!res.ok) {
        let msg = `${res.status}`;
        try {
          const data = await res.json();
          if (data?.detail) msg = `${res.status} ${data.detail}`;
        } catch {}
        throw new Error(msg);
      }
      
      // Show success toast
      toast.success(`"${playlistName}" saved successfully! 🎵`, {
        id: "save-playlist",
        description: "Check your Spotify library to find your new therapeutic playlist."
      });
    } catch (error) {
      // Show error toast
      toast.error("Failed to save playlist", {
        id: "save-playlist",
        description: "Please make sure you're logged in to Spotify and try again."
      });
      console.error("Save playlist error:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Ultra Vibrant Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-40 h-40 bg-accent-cyan/10 rounded-full blur-3xl pulse-glow sparkle-effect"></div>
        <div className="absolute top-40 right-20 w-32 h-32 bg-accent-purple/15 rounded-full blur-2xl beat-pulse"></div>
        <div className="absolute bottom-20 left-1/3 w-48 h-48 bg-accent-pink/12 rounded-full blur-3xl pulse-glow"></div>
        <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-accent-yellow/10 rounded-full blur-xl float-animation"></div>
        <div className="absolute bottom-40 right-10 w-36 h-36 bg-accent-lime/8 rounded-full blur-2xl melody-wave"></div>
      </div>
      
      <div className="container mx-auto py-24 px-4 relative z-10">
        <div className="text-center mb-16 float-animation">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-8 gradient-text sparkle-effect">
            🎵 Your Personal Music Therapist ✨
          </h1>
          <p className="text-xl md:text-2xl text-foreground/90 max-w-3xl mx-auto mb-8 leading-relaxed">
            🌈 Let Aura guide you through a sonic journey tailored to your emotional needs 🎶
          </p>
          
          {/* Animated Music Visualizer */}
          <div className="flex justify-center items-center space-x-8 mb-10">
            <div className="music-bars">
              <div className="music-bar"></div>
              <div className="music-bar"></div>
              <div className="music-bar"></div>
              <div className="music-bar"></div>
              <div className="music-bar"></div>
            </div>
            <span className="text-2xl font-bold gradient-text">AI Powered Therapy</span>
            <div className="music-bars">
              <div className="music-bar"></div>
              <div className="music-bar"></div>
              <div className="music-bar"></div>
              <div className="music-bar"></div>
              <div className="music-bar"></div>
            </div>
          </div>

          {/* Colorful Status Indicators */}
          <div className="flex flex-wrap justify-center gap-6 mb-12">
            <div className="flex items-center space-x-3 px-6 py-4 glass-card interactive-hover neon-glow">
              <div className="w-4 h-4 rounded-full bg-accent-cyan pulse-glow"></div>
              <span className="text-accent-cyan font-bold text-lg">🤖 AI Ready</span>
            </div>
            <div className="flex items-center space-x-3 px-6 py-4 glass-card interactive-hover neon-glow">
              <div className="w-4 h-4 rounded-full bg-accent-purple pulse-glow"></div>
              <span className="text-accent-purple font-bold text-lg">🎵 Music Engine</span>
            </div>
            <div className="flex items-center space-x-3 px-6 py-4 glass-card interactive-hover neon-glow">
              <div className="w-4 h-4 rounded-full bg-accent-pink pulse-glow"></div>
              <span className="text-accent-pink font-bold text-lg">✨ Personalized</span>
            </div>
          </div>
        </div>

        <div className="glass-card neon-glow interactive-hover melody-wave mb-8">
          <ChatInterface onPlaylistGenerated={handlePlaylistGenerated} onReset={handleReset} />
        </div>

        {generatedPlaylist.length > 0 && (
          <div className="flex items-center justify-end gap-4 mt-6 mb-8">
            <button 
              onClick={handleSave} 
              disabled={saving} 
              className="btn-vibrant text-lg px-8 py-4 sparkle-effect"
            >
              {saving ? (
                <>
                  <div className="loading-spinner mr-3"></div>
                  ✨ Saving Magic...
                </>
              ) : (
                <>
                  💾 Save to Spotify ✨
                </>
              )}
            </button>
          </div>
        )}
        
        {generatedPlaylist.length > 0 && (
          <div className="glass-card rainbow-border pulse-glow melody-wave">
            <div className="p-6">
              <div className="text-center mb-6">
                <h2 className="text-3xl font-bold gradient-text mb-4 sparkle-effect">
                  🎶 Your Therapeutic Playlist ✨
                </h2>
                <p className="text-lg text-foreground/80 mb-4">
                  🌈 AI-generated playlist tailored to your emotional journey
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <span className="px-4 py-2 bg-accent-cyan/20 text-accent-cyan rounded-full text-sm font-bold border border-accent-cyan/30">
                    🎯 Personalized
                  </span>
                  <span className="px-4 py-2 bg-accent-purple/20 text-accent-purple rounded-full text-sm font-bold border border-accent-purple/30">
                    🧠 Therapeutic
                  </span>
                  <span className="px-4 py-2 bg-accent-pink/20 text-accent-pink rounded-full text-sm font-bold border border-accent-pink/30">
                    🤖 AI-Powered
                  </span>
                </div>
              </div>
              <PlaylistView 
                playlist={generatedPlaylist} 
                onPlay={handlePlayAll} 
                moodTransition={moodTransition}
              />
            </div>
          </div>
        )}
      </div>

      {/* Music Player */}
      {isPlayerVisible && generatedPlaylist.length > 0 && (
        <MusicPlayer playlist={generatedPlaylist} />
      )}
    </div>
  );
};

export default Generator;
