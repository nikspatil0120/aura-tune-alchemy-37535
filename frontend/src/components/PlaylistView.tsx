import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Play } from "lucide-react";
import { Song } from "@/data/mockData";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

interface PlaylistViewProps {
  playlist: Song[];
  onPlay: () => void;
  moodTransition?: { from: string; to: string } | null;
}

const PlaylistView = ({ playlist, onPlay, moodTransition }: PlaylistViewProps) => {
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = async () => {
    try {
      const backend = (import.meta as any).env?.VITE_BACKEND_URL || "http://127.0.0.1:8000";
      const trackUris = playlist.map((s) => s.uri || `spotify:track:${s.id}`);
      const res = await apiFetch(`${backend}/user/save-playlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Therapeutic Playlist", track_uris: trackUris }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setIsSaved(true);
      toast.success("Playlist saved to your library!");
    } catch (e) {
      toast.error("Failed to save playlist. Please login and try again.");
    }
  };

  // Create a dynamic mood journey based on actual mood transition
  const moodData = playlist.map((song, index) => {
    const totalTracks = playlist.length;
    const progressRatio = index / Math.max(1, totalTracks - 1);
    
    // Map moods to numerical values (0-100 scale)
    const getMoodValue = (mood: string): number => {
      const moodMap: { [key: string]: number } = {
        // Negative moods (low values)
        'Sad': 15,
        'Melancholy': 20,
        'Depressed': 10,
        'Angry': 25,
        'Frustrated': 30,
        'Anxious': 20,
        'Stressed': 25,
        'Tired': 30,
        'Exhausted': 15,
        'Lonely': 20,
        'Overwhelmed': 25,
        
        // Neutral moods (middle values)
        'Calm': 50,
        'Peaceful': 55,
        'Focused': 60,
        'Relaxed': 55,
        'Contemplative': 45,
        'Reflective': 40,
        
        // Positive moods (high values)
        'Happy': 80,
        'Joyful': 85,
        'Energetic': 85,
        'Excited': 90,
        'Confident': 75,
        'Motivated': 80,
        'Uplifted': 75,
        'Released': 85,
        'Empowered': 80,
        'Inspired': 85,
        'Euphoric': 95,
        'Blissful': 90
      };
      
      // Try to find exact match first, then partial match
      if (moodMap[mood]) return moodMap[mood];
      
      // Check for partial matches (e.g., "Happy/Energetic" -> look for "Happy" or "Energetic")
      for (const [key, value] of Object.entries(moodMap)) {
        if (mood.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(mood.toLowerCase())) {
          return value;
        }
      }
      
      // Default fallback
      return 50;
    };
    
    // Get start and end mood values
    const startMoodValue = moodTransition ? getMoodValue(moodTransition.from) : 25;
    const endMoodValue = moodTransition ? getMoodValue(moodTransition.to) : 85;
    const moodRange = endMoodValue - startMoodValue;
    
    // Define mood journey phases based on music therapy principles
    let therapeuticMood;
    
    if (progressRatio <= 0.2) {
      // Phase 1: Acknowledgment (0-20%) - Start where user IS emotionally
      const acknowledgmentVariation = Math.sin(progressRatio * Math.PI * 4) * 5; // Natural fluctuation
      therapeuticMood = startMoodValue + acknowledgmentVariation;
      
    } else if (progressRatio <= 0.4) {
      // Phase 2: Stabilization (20-40%) - Gentle emotional grounding
      const stabilizationProgress = (progressRatio - 0.2) / 0.2; // 0 to 1 over this phase
      const stabilizationAmount = moodRange * 0.15; // Move 15% toward target
      const stabilityBoost = Math.sin((progressRatio - 0.2) * Math.PI * 2) * 3;
      therapeuticMood = startMoodValue + (stabilizationAmount * stabilizationProgress) + stabilityBoost;
      
    } else if (progressRatio <= 0.7) {
      // Phase 3: Elevation (40-70%) - Active mood lifting
      const elevationStart = startMoodValue + (moodRange * 0.15);
      const elevationProgress = (progressRatio - 0.4) / 0.3; // 0 to 1 over this phase
      const elevationCurve = 1 - Math.pow(1 - elevationProgress, 2); // Accelerating curve
      const elevationAmount = moodRange * 0.6; // Move 60% of remaining distance
      therapeuticMood = elevationStart + (elevationAmount * elevationCurve);
      
    } else {
      // Phase 4: Integration (70-100%) - Solidify the new emotional state
      const integrationStart = startMoodValue + (moodRange * 0.75);
      const integrationProgress = (progressRatio - 0.7) / 0.3;
      const integrationCurve = Math.sqrt(integrationProgress); // Decelerating curve
      const integrationAmount = moodRange * 0.25; // Final 25% to target
      therapeuticMood = integrationStart + (integrationAmount * integrationCurve);
    }
    
    // Add realistic variation based on actual song characteristics
    const songMoodInfluence = (song.valence + song.energy) / 2 * 100;
    const songVariation = (songMoodInfluence - 50) * 0.15; // Subtle influence
    
    // Add natural human emotional fluctuation (small ups and downs)
    const naturalFluctuation = Math.sin(index * 0.8) * 3;
    
    const finalMood = Math.max(15, Math.min(90, 
      therapeuticMood + songVariation + naturalFluctuation
    ));
    
    return {
      name: `Track ${index + 1}`,
      mood: Math.round(finalMood),
      phase: progressRatio <= 0.2 ? 'Acknowledgment' : 
             progressRatio <= 0.4 ? 'Stabilization' : 
             progressRatio <= 0.7 ? 'Elevation' : 'Integration'
    };
  });

  return (
    <div className="mt-8 space-y-6">
      {/* Mood Journey Chart */}
      <Card className="backdrop-blur-glass bg-glass-bg/50 border-glass-border p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-heading font-semibold">Your Mood Journey</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Music therapy journey: Acknowledgment → Stabilization → Elevation → Integration
            </p>
          </div>
          <Button
            onClick={handleSave}
            variant="ghost"
            size="icon"
            className={`rounded-full transition-all duration-300 ${
              isSaved ? "text-red-500" : "text-muted-foreground hover:text-red-500"
            }`}
          >
            <Heart className={`w-5 h-5 ${isSaved ? "fill-current" : ""}`} />
          </Button>
        </div>
        
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={moodData}>
            <defs>
              <linearGradient id="moodGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9} />   {/* Acknowledgment - Purple */}
                <stop offset="20%" stopColor="#3b82f6" stopOpacity={0.9} />  {/* Stabilization - Blue */}
                <stop offset="40%" stopColor="#06b6d4" stopOpacity={0.9} />  {/* Transition - Cyan */}
                <stop offset="70%" stopColor="#10b981" stopOpacity={0.9} />  {/* Elevation - Green */}
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.9} /> {/* Integration - Gold */}
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="name" 
              stroke="rgba(255,255,255,0.5)" 
              fontSize={12}
              interval="preserveStartEnd"
            />
            <YAxis 
              stroke="rgba(255,255,255,0.5)" 
              fontSize={12}
              domain={[0, 100]}
              label={{ value: 'Mood Level', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: 'rgba(255,255,255,0.7)' } }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "rgba(0,0,0,0.9)", 
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "12px",
                color: "white"
              }}
              labelStyle={{ color: "white" }}
              formatter={(value: number, name: string, props: any) => [
                `${value}% - ${props.payload?.phase || 'Therapeutic Phase'}`, 
                'Mood Level'
              ]}
            />
            <Line 
              type="monotone" 
              dataKey="mood" 
              stroke="url(#moodGradient)" 
              strokeWidth={4}
              dot={{ fill: "#36D1DC", r: 5, strokeWidth: 2, stroke: "white" }}
              activeDot={{ r: 8, fill: "#36D1DC", stroke: "white", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Playlist Tracks */}
      <Card className="backdrop-blur-glass bg-glass-bg/50 border-glass-border p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-heading font-semibold">
              {moodTransition 
                ? `Therapeutic Playlist (${moodTransition.from} → ${moodTransition.to})`
                : "Your Therapeutic Playlist"
              }
            </h3>
            {moodTransition && (
              <p className="text-sm text-muted-foreground mt-1">
                Curated to help you transition from {moodTransition.from.toLowerCase()} to {moodTransition.to.toLowerCase()}
              </p>
            )}
          </div>
          <Button
            onClick={onPlay}
            className="bg-primary hover:bg-primary/90 shadow-glow-calm hover:scale-105 transition-all duration-300"
          >
            <Play className="w-4 h-4 mr-2" />
            Play All
          </Button>
        </div>
        
        <div className="space-y-4">
          {playlist.map((song, index) => (
            <div
              key={`${song.id}-${index}`}
              className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all duration-300 group cursor-pointer"
            >
              <span className="text-sm text-muted-foreground w-6">{index + 1}</span>
              <img
                src={song.albumArt}
                alt={song.title}
                className="w-14 h-14 rounded-lg object-cover shadow-lg group-hover:shadow-glow-calm transition-all duration-300"
              />
              <div className="flex-1">
                <p className="font-semibold">{song.title}</p>
                <p className="text-sm text-muted-foreground">{song.artist}</p>
              </div>
              <div className="hidden md:flex gap-2">
                <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">
                  {song.key}
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">
                  {song.tempo} BPM
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default PlaylistView;
