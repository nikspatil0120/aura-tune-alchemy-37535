import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { mockUser, User } from "@/data/mockData";
import { apiFetch } from "@/lib/api";

interface SpotifyUser {
  spotify_id: string;
  display_name: string;
  email: string;
  saved_playlists: any[];
}

interface UserContextType {
  user: User | null;
  spotifyUser: SpotifyUser | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [spotifyUser, setSpotifyUser] = useState<SpotifyUser | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserProfile = async (): Promise<SpotifyUser | null> => {
    try {
      const backend = (import.meta as any).env?.VITE_BACKEND_URL || "http://127.0.0.1:8000";
      const response = await apiFetch(`${backend}/user/me`);
      
      if (response.ok) {
        const userData = await response.json();
        return userData;
      } else if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem("auratune_token");
        return null;
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
    }
    return null;
  };

  const login = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("auratune_token");
      if (token) {
        const userData = await fetchUserProfile();
        if (userData) {
          setSpotifyUser(userData);
          // Convert Spotify user to our User format for compatibility
          const compatUser: User = {
            name: userData.display_name || "Spotify User",
            email: userData.email || "",
            listeningHistory: [],
            savedPlaylists: userData.saved_playlists.map(p => p.name || "Untitled Playlist")
          };
          setUser(compatUser);
          setIsLoggedIn(true);
        } else {
          // Fallback to mock user if API fails but token exists
          setUser(mockUser);
          setIsLoggedIn(true);
        }
      }
    } catch (error) {
      console.error("Login failed:", error);
      // Fallback to mock user
      setUser(mockUser);
      setIsLoggedIn(true);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    const userData = await fetchUserProfile();
    if (userData) {
      setSpotifyUser(userData);
      const compatUser: User = {
        name: userData.display_name || "Spotify User",
        email: userData.email || "",
        listeningHistory: [],
        savedPlaylists: userData.saved_playlists.map(p => p.name || "Untitled Playlist")
      };
      setUser(compatUser);
    }
  };

  const logout = () => {
    try { 
      localStorage.removeItem("auratune_token");
      // Also clear any cookies
      document.cookie = "auratune_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    } catch {}
    setUser(null);
    setSpotifyUser(null);
    setIsLoggedIn(false);
  };

  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem("auratune_token");
        if (token) {
          await login();
        }
      } catch (error) {
        console.error("Auth initialization failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  return (
    <UserContext.Provider value={{ 
      user, 
      spotifyUser, 
      isLoggedIn, 
      isLoading, 
      login, 
      logout, 
      refreshUser 
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
