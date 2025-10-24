import { useState, useEffect } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Song } from "@/data/mockData";

interface MusicPlayerProps {
  playlist: Song[];
}

const MusicPlayer = ({ playlist }: MusicPlayerProps) => {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(70);

  const currentTrack = playlist[currentTrackIndex];

  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            handleNext();
            return 0;
          }
          return prev + 0.5;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isPlaying, currentTrackIndex]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % playlist.length);
    setProgress(0);
  };

  const handlePrevious = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + playlist.length) % playlist.length);
    setProgress(0);
  };

  if (!currentTrack) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-glass bg-glass-bg/95 border-t border-glass-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-4">
          {/* Album Art & Track Info */}
          <div className="flex items-center gap-3 min-w-[200px]">
            <img
              src={currentTrack.albumArt}
              alt={currentTrack.title}
              className="w-14 h-14 rounded-xl object-cover shadow-glow-calm"
            />
            <div className="hidden md:block">
              <p className="font-semibold text-sm">{currentTrack.title}</p>
              <p className="text-xs text-muted-foreground">{currentTrack.artist}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex-1 flex flex-col items-center gap-2">
            <div className="flex items-center gap-4">
              <Button
                size="icon"
                variant="ghost"
                onClick={handlePrevious}
                className="hover:bg-primary/20 transition-all duration-300"
              >
                <SkipBack className="w-5 h-5" />
              </Button>
              <Button
                size="icon"
                onClick={handlePlayPause}
                className="bg-primary hover:bg-primary/90 rounded-full w-12 h-12 shadow-glow-calm hover:scale-105 transition-all duration-300"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleNext}
                className="hover:bg-primary/20 transition-all duration-300"
              >
                <SkipForward className="w-5 h-5" />
              </Button>
            </div>

            {/* Progress Bar */}
            <div className="w-full max-w-md flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {Math.floor((progress / 100) * 180)}:{((progress / 100) * 180 % 60).toFixed(0).padStart(2, "0")}
              </span>
              <Slider
                value={[progress]}
                onValueChange={(value) => setProgress(value[0])}
                max={100}
                step={1}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground">3:00</span>
            </div>
          </div>

          {/* Volume */}
          <div className="hidden lg:flex items-center gap-2 min-w-[150px]">
            <Volume2 className="w-5 h-5 text-muted-foreground" />
            <Slider
              value={[volume]}
              onValueChange={(value) => setVolume(value[0])}
              max={100}
              step={1}
              className="w-24"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicPlayer;
