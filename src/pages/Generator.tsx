import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, Pause, SkipForward, Heart, Frown, Smile, Zap, Battery, Angry } from "lucide-react";
import { emotions, goals, mockSongs } from "@/data/mockData";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const iconMap: Record<string, any> = {
  anxious: Frown,
  joyful: Smile,
  melancholy: Heart,
  focused: Zap,
  angry: Angry,
  tired: Battery,
  calm: Heart,
  energetic: Zap,
  comforted: Heart,
  productive: Zap,
  released: Smile,
  peaceful: Heart,
};

const Generator = () => {
  const [step, setStep] = useState<"emotion" | "goal" | "generating" | "playlist">("emotion");
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);

  const handleEmotionSelect = (emotionId: string) => {
    setSelectedEmotion(emotionId);
  };

  const handleGoalSelect = (goalId: string) => {
    setSelectedGoal(goalId);
  };

  const handleGenerate = () => {
    setStep("generating");
    setTimeout(() => {
      setStep("playlist");
    }, 3000);
  };

  const getMoodGradient = (mood: string) => {
    switch (mood) {
      case "calm": return "gradient-calm";
      case "happy": return "gradient-happy";
      case "sad": return "gradient-sad";
      default: return "gradient-calm";
    }
  };

  const getMoodShadow = (mood: string) => {
    switch (mood) {
      case "calm": return "shadow-glow-calm";
      case "happy": return "shadow-glow-happy";
      case "sad": return "shadow-glow-sad";
      default: return "shadow-glow-calm";
    }
  };

  // Generate mood journey data
  const moodJourneyData = mockSongs.map((song, index) => ({
    name: `Track ${index + 1}`,
    mood: Math.round((song.valence * 50 + song.energy * 50) * 100) / 100,
  }));

  return (
    <div className="min-h-screen py-24 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Emotion Selection */}
        {step === "emotion" && (
          <div className="animate-slide-up">
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-center mb-4">
              How are you feeling right now?
            </h1>
            <p className="text-muted-foreground text-center mb-12 text-lg">
              Select the emotion that best describes your current state
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8">
              {emotions.map((emotion) => {
                const Icon = iconMap[emotion.id];
                const isSelected = selectedEmotion === emotion.id;
                return (
                  <Card
                    key={emotion.id}
                    onClick={() => handleEmotionSelect(emotion.id)}
                    className={`p-6 md:p-8 cursor-pointer backdrop-blur-glass bg-glass-bg/50 border-2 transition-all duration-300 hover:scale-105 rounded-2xl ${
                      isSelected
                        ? `border-primary bg-${getMoodGradient(emotion.mood)} ${getMoodShadow(emotion.mood)}`
                        : "border-glass-border hover:border-primary/50"
                    }`}
                  >
                    <Icon className={`w-8 h-8 md:w-12 md:h-12 mx-auto mb-4 ${isSelected ? "text-white" : "text-primary"}`} />
                    <p className={`text-center font-heading font-semibold text-lg ${isSelected ? "text-white" : ""}`}>
                      {emotion.label}
                    </p>
                  </Card>
                );
              })}
            </div>

            <div className="flex justify-center">
              <Button
                onClick={() => setStep("goal")}
                disabled={!selectedEmotion}
                size="lg"
                className="bg-primary hover:bg-primary/90 shadow-glow-calm hover:scale-105 transition-all rounded-xl"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Goal Selection */}
        {step === "goal" && (
          <div className="animate-slide-up">
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-center mb-4">
              Where do you want to be?
            </h1>
            <p className="text-muted-foreground text-center mb-12 text-lg">
              Choose your desired emotional state
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8">
              {goals.map((goal) => {
                const Icon = iconMap[goal.id];
                const isSelected = selectedGoal === goal.id;
                return (
                  <Card
                    key={goal.id}
                    onClick={() => handleGoalSelect(goal.id)}
                    className={`p-6 md:p-8 cursor-pointer backdrop-blur-glass bg-glass-bg/50 border-2 transition-all duration-300 hover:scale-105 rounded-2xl ${
                      isSelected
                        ? `border-primary bg-${getMoodGradient(goal.mood)} ${getMoodShadow(goal.mood)}`
                        : "border-glass-border hover:border-primary/50"
                    }`}
                  >
                    <Icon className={`w-8 h-8 md:w-12 md:h-12 mx-auto mb-4 ${isSelected ? "text-white" : "text-primary"}`} />
                    <p className={`text-center font-heading font-semibold text-lg ${isSelected ? "text-white" : ""}`}>
                      {goal.label}
                    </p>
                  </Card>
                );
              })}
            </div>

            <div className="flex justify-center gap-4">
              <Button
                onClick={() => setStep("emotion")}
                variant="outline"
                size="lg"
                className="rounded-xl"
              >
                Back
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={!selectedGoal}
                size="lg"
                className="bg-primary hover:bg-primary/90 shadow-glow-calm hover:scale-105 transition-all rounded-xl"
              >
                Generate Playlist
              </Button>
            </div>
          </div>
        )}

        {/* Generating State */}
        {step === "generating" && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] animate-slide-up">
            <div className="relative w-32 h-32 mb-8">
              <div className="absolute inset-0 rounded-full bg-gradient-calm animate-pulse-glow"></div>
              <div className="absolute inset-2 rounded-full bg-background"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            </div>
            <h2 className="text-3xl font-heading font-bold mb-2">Calibrating your frequency...</h2>
            <p className="text-muted-foreground text-lg">Crafting your perfect sonic journey</p>
          </div>
        )}

        {/* Playlist View */}
        {step === "playlist" && (
          <div className="animate-slide-up">
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-center mb-4">
              Your Sonic Journey
            </h1>
            <p className="text-muted-foreground text-center mb-12 text-lg">
              From {emotions.find(e => e.id === selectedEmotion)?.label} to {goals.find(g => g.id === selectedGoal)?.label}
            </p>

            {/* Mood Journey Chart */}
            <Card className="p-6 backdrop-blur-glass bg-glass-bg/50 border-glass-border mb-8 rounded-2xl">
              <h3 className="text-xl font-heading font-semibold mb-4">Emotional Arc</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={moodJourneyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem"
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="mood" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: "hsl(var(--primary))", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* Playlist */}
            <div className="space-y-4">
              {mockSongs.map((song, index) => (
                <Card
                  key={song.id}
                  className={`p-4 backdrop-blur-glass bg-glass-bg/50 border-glass-border hover:border-primary/50 transition-all duration-300 rounded-xl ${
                    currentTrack === index ? "border-primary shadow-glow-calm" : ""
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={song.albumArt}
                      alt={song.title}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <h3 className="font-heading font-semibold text-lg">{song.title}</h3>
                      <p className="text-muted-foreground">{song.artist}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant={currentTrack === index && isPlaying ? "default" : "outline"}
                        onClick={() => {
                          setCurrentTrack(index);
                          setIsPlaying(!isPlaying);
                        }}
                        className="rounded-lg"
                      >
                        {currentTrack === index && isPlaying ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex justify-center mt-8">
              <Button
                onClick={() => {
                  setStep("emotion");
                  setSelectedEmotion(null);
                  setSelectedGoal(null);
                  setIsPlaying(false);
                  setCurrentTrack(0);
                }}
                variant="outline"
                size="lg"
                className="rounded-xl"
              >
                Create Another Journey
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Generator;
