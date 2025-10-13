export interface Song {
  id: string;
  title: string;
  artist: string;
  albumArt: string;
  trackUrl: string;
  valence: number; // 0-1 (sad to happy)
  energy: number; // 0-1
  tempo: number; // BPM
  key: string;
  acousticness: number; // 0-1
  danceability: number; // 0-1
}

export interface User {
  name: string;
  email: string;
  listeningHistory: Song[];
  savedPlaylists: string[];
}

export const mockSongs: Song[] = [
  {
    id: "1",
    title: "Weightless",
    artist: "Marconi Union",
    albumArt: "https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=400&h=400&fit=crop",
    trackUrl: "https://example.com/track1.mp3",
    valence: 0.3,
    energy: 0.2,
    tempo: 60,
    key: "C Minor",
    acousticness: 0.9,
    danceability: 0.1,
  },
  {
    id: "2",
    title: "Clair de Lune",
    artist: "Claude Debussy",
    albumArt: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=400&h=400&fit=crop",
    trackUrl: "https://example.com/track2.mp3",
    valence: 0.4,
    energy: 0.3,
    tempo: 65,
    key: "D♭ Major",
    acousticness: 0.95,
    danceability: 0.15,
  },
  {
    id: "3",
    title: "Breathe",
    artist: "Télépopmusik",
    albumArt: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop",
    trackUrl: "https://example.com/track3.mp3",
    valence: 0.5,
    energy: 0.4,
    tempo: 90,
    key: "A Minor",
    acousticness: 0.6,
    danceability: 0.5,
  },
  {
    id: "4",
    title: "Sunset Lover",
    artist: "Petit Biscuit",
    albumArt: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=400&fit=crop",
    trackUrl: "https://example.com/track4.mp3",
    valence: 0.65,
    energy: 0.55,
    tempo: 100,
    key: "G Major",
    acousticness: 0.5,
    danceability: 0.6,
  },
  {
    id: "5",
    title: "Electric Feel",
    artist: "MGMT",
    albumArt: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
    trackUrl: "https://example.com/track5.mp3",
    valence: 0.75,
    energy: 0.7,
    tempo: 115,
    key: "E Major",
    acousticness: 0.2,
    danceability: 0.75,
  },
  {
    id: "6",
    title: "Levitating",
    artist: "Dua Lipa",
    albumArt: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=400&fit=crop",
    trackUrl: "https://example.com/track6.mp3",
    valence: 0.85,
    energy: 0.85,
    tempo: 130,
    key: "B Major",
    acousticness: 0.1,
    danceability: 0.9,
  },
];

export const mockUser: User = {
  name: "Alex",
  email: "alex@auratune.com",
  listeningHistory: mockSongs.slice(0, 4),
  savedPlaylists: [],
};

export const emotions = [
  { id: "anxious", label: "Anxious", mood: "sad" },
  { id: "joyful", label: "Joyful", mood: "happy" },
  { id: "melancholy", label: "Melancholy", mood: "sad" },
  { id: "focused", label: "Focused", mood: "calm" },
  { id: "angry", label: "Angry", mood: "sad" },
  { id: "tired", label: "Tired", mood: "calm" },
];

export const goals = [
  { id: "calm", label: "Calm", mood: "calm" },
  { id: "energetic", label: "Energetic", mood: "happy" },
  { id: "comforted", label: "Comforted", mood: "calm" },
  { id: "productive", label: "Productive", mood: "calm" },
  { id: "released", label: "Released", mood: "happy" },
  { id: "peaceful", label: "Peaceful", mood: "calm" },
];

export const archetypes = [
  {
    name: "The Nocturnal Thinker",
    description: "You find solace in the quiet hours, drawn to introspective melodies and ambient soundscapes. Your musical journey is one of deep reflection and emotional exploration.",
  },
  {
    name: "The Daylight Dancer",
    description: "Energy flows through your veins with every beat. You gravitate toward uplifting rhythms and vibrant melodies that mirror your zest for life.",
  },
  {
    name: "The Emotional Alchemist",
    description: "Music is your tool for transformation. You masterfully use sound to shift between emotional states, turning challenges into catalysts for growth.",
  },
];

export const moodInsights = [
  {
    title: "Anxiety Antidote",
    description: "When feeling anxious, you often gravitate towards songs in a Minor key with a low tempo between 60-80 BPM. These tracks typically have high acousticness (>0.7).",
    pattern: "anxious → low tempo + acoustic + minor key",
  },
  {
    title: "Focus Formula",
    description: "Your focus playlists frequently feature instrumental tracks with high acousticness (>0.6) and moderate energy levels (0.4-0.6). Minimal vocals help you concentrate.",
    pattern: "focused → instrumental + moderate energy",
  },
  {
    title: "Joy Generator",
    description: "When seeking happiness, you choose upbeat tracks with high valence (>0.7), fast tempo (>120 BPM), and high danceability. Major keys dominate these selections.",
    pattern: "seeking joy → upbeat + major key + high danceability",
  },
  {
    title: "Evening Wind-Down",
    description: "Your nighttime listening patterns show a preference for ambient and downtempo genres with decreasing energy levels, preparing your mind for rest.",
    pattern: "evening → ambient + decreasing energy",
  },
];
