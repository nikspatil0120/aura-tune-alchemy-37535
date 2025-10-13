import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Play } from "lucide-react";
import { Song } from "@/data/mockData";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";

interface PlaylistViewProps {
  playlist: Song[];
  onPlay: () => void;
}

const PlaylistView = ({ playlist, onPlay }: PlaylistViewProps) => {
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    setIsSaved(true);
    toast.success("Playlist saved to your library!");
  };

  const moodData = playlist.map((song, index) => ({
    name: `Track ${index + 1}`,
    mood: Math.round((song.valence + song.energy) / 2 * 100),
  }));

  return (
    <div className="mt-8 space-y-6">
      {/* Mood Journey Chart */}
      <Card className="backdrop-blur-glass bg-glass-bg/50 border-glass-border p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-heading font-semibold">Your Mood Journey</h3>
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
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
            <YAxis stroke="rgba(255,255,255,0.5)" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "rgba(0,0,0,0.8)", 
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "12px"
              }} 
            />
            <Line 
              type="monotone" 
              dataKey="mood" 
              stroke="url(#moodGradient)" 
              strokeWidth={3}
              dot={{ fill: "#36D1DC", r: 6 }}
            />
            <defs>
              <linearGradient id="moodGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#36D1DC" />
                <stop offset="100%" stopColor="#5B86E5" />
              </linearGradient>
            </defs>
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Playlist Tracks */}
      <Card className="backdrop-blur-glass bg-glass-bg/50 border-glass-border p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-heading font-semibold">Your Therapeutic Playlist</h3>
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
              key={song.id}
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
