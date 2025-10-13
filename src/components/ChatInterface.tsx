import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { emotions, goals, mockSongs, Song } from "@/data/mockData";
import { useUser } from "@/contexts/UserContext";

interface Message {
  role: "assistant" | "user";
  content: string;
  options?: Array<{ id: string; label: string }>;
}

interface ChatInterfaceProps {
  onPlaylistGenerated: (playlist: Song[]) => void;
}

const ChatInterface = ({ onPlaylistGenerated }: ChatInterfaceProps) => {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: user 
        ? `Welcome back, ${user.name}. I can help you find the perfect music for your mood. To start, how are you feeling right now?`
        : "Hello, I'm Aura. I can help you find the perfect music for your mood. To start, how are you feeling right now?",
      options: emotions.map((e) => ({ id: e.id, label: e.label })),
    },
  ]);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleMoodSelect = (moodId: string, moodLabel: string) => {
    setSelectedMood(moodId);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: moodLabel },
      {
        role: "assistant",
        content: "I understand. And where would you like the music to take you? What is your goal?",
        options: goals.map((g) => ({ id: g.id, label: g.label })),
      },
    ]);
  };

  const handleGoalSelect = (goalId: string, goalLabel: string) => {
    setMessages((prev) => [
      ...prev,
      { role: "user", content: goalLabel },
      {
        role: "assistant",
        content: "Perfect. I'm crafting a therapeutic playlist to bridge that gap for you. Give me just a moment...",
      },
    ]);

    setIsGenerating(true);

    // Simulate playlist generation
    setTimeout(() => {
      const generatedPlaylist = [...mockSongs].sort(() => Math.random() - 0.5).slice(0, 4);
      onPlaylistGenerated(generatedPlaylist);
      setIsGenerating(false);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Your personalized playlist is ready! I've curated these tracks to help you transition smoothly. Enjoy your journey.",
        },
      ]);
    }, 2000);
  };

  return (
    <Card className="backdrop-blur-glass bg-glass-bg/50 border-glass-border p-6 rounded-2xl max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-gradient-calm flex items-center justify-center">
          <div className="w-6 h-6 rounded-full bg-white/30 animate-pulse-glow"></div>
        </div>
        <div>
          <h3 className="font-heading font-semibold text-lg">Aura</h3>
          <p className="text-sm text-muted-foreground">Your AI Music Therapist</p>
        </div>
      </div>

      <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-foreground"
              }`}
            >
              <p className="text-sm">{message.content}</p>
              {message.options && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {message.options.map((option) => (
                    <Button
                      key={option.id}
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (!selectedMood) {
                          handleMoodSelect(option.id, option.label);
                        } else {
                          handleGoalSelect(option.id, option.label);
                        }
                      }}
                      className="bg-background/50 hover:bg-primary/20 border-primary/30 hover:border-primary/50 transition-all duration-300"
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isGenerating && (
          <div className="flex justify-start">
            <div className="bg-muted/50 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: "0.2s" }}></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: "0.4s" }}></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ChatInterface;
