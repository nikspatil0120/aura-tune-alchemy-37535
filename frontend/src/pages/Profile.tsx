import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/contexts/UserContext";
import { apiFetch } from "@/lib/api";
import { Music2, User, Mail, ExternalLink, RefreshCw, LogOut } from "lucide-react";
import { toast } from "sonner";

interface SpotifyProfile {
  spotify_id: string;
  display_name?: string | null;
  email?: string | null;
  saved_playlists: { 
    name: string; 
    tracks: string[]; 
    spotify_playlist_id?: string;
    spotify_url?: string;
  }[];
}

const Profile = () => {
  const { user, spotifyUser, isLoggedIn, logout, refreshUser } = useUser();
  const [profile, setProfile] = useState<SpotifyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const backend = (import.meta as any).env?.VITE_BACKEND_URL || "http://127.0.0.1:8000";
      const response = await apiFetch(`${backend}/user/me`);
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Please log in with Spotify to view your profile");
        }
        throw new Error(`Failed to load profile: ${response.status}`);
      }
      
      const data = await response.json() as SpotifyProfile;
      console.log('🔍 Profile data received:', data);
      console.log('🖼️ Profile image URL:', data.profile_image_url);
      setProfile(data);
      toast.success("Profile loaded successfully!");
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Failed to load profile";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchProfile();
    }
  }, [isLoggedIn]);

  const handleLinkSpotify = () => {
    const backend = (import.meta as any).env?.VITE_BACKEND_URL || "http://127.0.0.1:8000";
    window.location.href = `${backend}/auth/login/spotify`;
  };

  const handleRefresh = async () => {
    await Promise.all([refreshUser(), fetchProfile()]);
  };

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
  };

  if (!isLoggedIn) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="backdrop-blur-glass bg-glass-bg/50 border-glass-border p-8 rounded-2xl max-w-md mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-calm mb-6 shadow-glow-calm">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-heading font-bold mb-4">Profile</h1>
          <p className="text-muted-foreground mb-6">
            Please log in with Spotify to view your profile and saved playlists.
          </p>
          <Button 
            onClick={handleLinkSpotify}
            className="bg-[#1DB954] hover:bg-[#1DB954]/90 text-white"
          >
            <Music2 className="w-4 h-4 mr-2" />
            Connect with Spotify
          </Button>
        </Card>
      </div>
    );
  }

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
      
      <div className="container mx-auto px-4 py-16 space-y-12 relative z-10">
        {/* Header */}
        <div className="text-center mb-16 float-animation">
          <h1 className="text-6xl font-bold gradient-text mb-6 sparkle-effect">
            🎵 Your Musical Profile ✨
          </h1>
          <p className="text-2xl text-foreground/80 mb-8">
            🌈 Manage your account, view saved playlists, and track your therapeutic journey
          </p>
          
          {/* Action Buttons */}
          <div className="flex justify-center gap-6">
            <button 
              onClick={handleRefresh}
              disabled={isLoading}
              className="glass-card interactive-hover neon-glow px-6 py-3 border border-accent-cyan/30 hover:border-accent-purple/50 transition-all duration-300"
            >
              <div className="flex items-center space-x-3">
                <RefreshCw className={`w-5 h-5 text-accent-cyan ${isLoading ? 'animate-spin' : ''}`} />
                <span className="font-bold gradient-text">🔄 Refresh</span>
              </div>
            </button>
            <button 
              onClick={handleLogout}
              className="glass-card interactive-hover neon-glow px-6 py-3 border border-accent-red/30 hover:border-accent-orange/50 transition-all duration-300"
            >
              <div className="flex items-center space-x-3">
                <LogOut className="w-5 h-5 text-accent-red" />
                <span className="font-bold text-accent-red">🚪 Logout</span>
              </div>
            </button>
          </div>
        </div>

        {/* Profile Information */}
      <div className="glass-card neon-glow interactive-hover melody-wave p-8">
        <div className="flex items-start gap-8">
          <div className="relative">
            {profile?.profile_image_url ? (
              <div className="relative">
                <img 
                  src={profile.profile_image_url} 
                  alt="Profile"
                  className="w-24 h-24 rounded-2xl object-cover neon-glow pulse-glow sparkle-effect border-2 border-accent-cyan/30"
                  onError={(e) => {
                    console.log('❌ Profile image failed to load:', profile.profile_image_url);
                    // Hide the image and show fallback
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.parentElement?.nextElementSibling as HTMLElement;
                    if (fallback) {
                      fallback.style.display = 'flex';
                    }
                  }}
                  onLoad={() => {
                    console.log('✅ Profile image loaded successfully:', profile.profile_image_url);
                  }}
                />
              </div>
            ) : null}
            <div 
              className={`w-24 h-24 rounded-2xl bg-gradient-to-br from-accent-cyan via-accent-purple to-accent-pink flex items-center justify-center neon-glow pulse-glow sparkle-effect text-3xl font-bold text-white ${profile?.profile_image_url ? 'hidden' : 'flex'}`}
            >
              {profile?.display_name?.charAt(0)?.toUpperCase() || user?.name?.charAt(0)?.toUpperCase() || '🎵'}
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-accent-green rounded-full border-3 border-card flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded-full pulse-glow"></div>
            </div>
          </div>
          
          <div className="flex-1 space-y-6">
            <div>
              <h2 className="text-3xl font-bold gradient-text mb-4 sparkle-effect">
                🎭 {profile?.display_name || user?.name || "Spotify User"}
              </h2>
              <div className="flex flex-wrap gap-3">
                <div className="px-4 py-2 bg-accent-green/20 text-accent-green rounded-full border border-accent-green/30 flex items-center space-x-2">
                  <Music2 className="w-4 h-4" />
                  <span className="font-bold">🎵 Connected to Spotify</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                <User className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Spotify ID</p>
                  <p className="font-medium">{profile?.spotify_id || "Loading..."}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{profile?.email || user?.email || "Not provided"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="glass-card neon-glow p-6 border border-accent-red/30 bg-accent-red/10">
          <p className="text-accent-red font-bold text-lg">⚠️ {error}</p>
          <button 
            onClick={fetchProfile}
            className="mt-4 glass-card interactive-hover neon-glow px-4 py-2 border border-accent-red/30 hover:border-accent-orange/50 transition-all duration-300 font-bold text-accent-red"
          >
            🔄 Try Again
          </button>
        </div>
      )}

      {/* Saved Playlists */}
      <div className="glass-card rainbow-border pulse-glow p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-heading font-semibold">Saved Playlists</h3>
          <div className="px-4 py-2 bg-accent-purple/20 text-accent-purple rounded-full border border-accent-purple/30 font-bold">
            🎵 {profile?.saved_playlists?.length || 0} playlists
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading playlists...</p>
          </div>
        ) : profile?.saved_playlists?.length ? (
          <div className="grid gap-4">
            {profile.saved_playlists.map((playlist, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-happy flex items-center justify-center">
                    <Music2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold">{playlist.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {playlist.tracks.length} tracks
                    </p>
                  </div>
                </div>
                
                {playlist.spotify_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(playlist.spotify_url, '_blank')}
                    className="hover:bg-[#1DB954]/20 hover:text-[#1DB954]"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open in Spotify
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Music2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No playlists saved yet</p>
            <p className="text-sm text-muted-foreground">
              Generate and save playlists from the main page to see them here!
            </p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default Profile;
