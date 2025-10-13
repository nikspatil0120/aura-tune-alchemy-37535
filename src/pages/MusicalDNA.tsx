import { Card } from "@/components/ui/card";
import { Brain } from "lucide-react";
import { archetypes } from "@/data/mockData";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { useUser } from "@/contexts/UserContext";

const MusicalDNA = () => {
  const { user, isLoggedIn } = useUser();
  
  const audioFeatures = [
    { feature: "Valence", value: 65, fullMark: 100 },
    { feature: "Energy", value: 70, fullMark: 100 },
    { feature: "Danceability", value: 55, fullMark: 100 },
    { feature: "Acousticness", value: 45, fullMark: 100 },
    { feature: "Tempo", value: 75, fullMark: 100 },
  ];

  const genreData = [
    { name: "Electronic", size: 3500, fill: "hsl(var(--primary))" },
    { name: "Ambient", size: 2800, fill: "hsl(var(--secondary))" },
    { name: "Indie", size: 2200, fill: "hsl(var(--accent))" },
    { name: "Classical", size: 1800, fill: "hsl(177, 73%, 40%)" },
    { name: "Pop", size: 1500, fill: "hsl(250, 60%, 50%)" },
    { name: "Jazz", size: 1200, fill: "hsl(320, 80%, 45%)" },
  ];

  const currentArchetype = archetypes[0];

  return (
    <div className="min-h-screen py-24 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <Brain className="w-16 h-16 mx-auto mb-4 text-primary" />
          <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4">
            {isLoggedIn && user ? `${user.name}'s Musical DNA` : "Your Musical DNA"}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {isLoggedIn 
              ? "A deep dive into your unique audio fingerprint based on your listening history"
              : "A deep dive into the unique audio fingerprint that defines your listening personality"
            }
          </p>
        </div>

        {/* Archetype */}
        <Card className="p-8 backdrop-blur-glass bg-glass-bg/50 border-glass-border mb-8 rounded-2xl animate-slide-up">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-happy mb-6 shadow-glow-happy">
              <span className="text-4xl">✨</span>
            </div>
            <h2 className="text-3xl font-heading font-bold mb-3">{currentArchetype.name}</h2>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto">
              {currentArchetype.description}
            </p>
          </div>
        </Card>

        {/* Audio Features Radar */}
        <Card className="p-8 backdrop-blur-glass bg-glass-bg/50 border-glass-border mb-8 rounded-2xl animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <h3 className="text-2xl font-heading font-semibold mb-6">Audio Profile</h3>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={audioFeatures}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis 
                dataKey="feature" 
                tick={{ fill: "hsl(var(--foreground))", fontSize: 14 }}
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 100]}
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <Radar 
                name="Your Profile" 
                dataKey="value" 
                stroke="hsl(var(--primary))" 
                fill="hsl(var(--primary))" 
                fillOpacity={0.5}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8">
            {audioFeatures.map((feature) => (
              <div key={feature.feature} className="text-center">
                <div className="text-3xl font-heading font-bold text-primary mb-1">
                  {feature.value}%
                </div>
                <div className="text-sm text-muted-foreground">{feature.feature}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Genre Distribution */}
        <Card className="p-8 backdrop-blur-glass bg-glass-bg/50 border-glass-border rounded-2xl animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <h3 className="text-2xl font-heading font-semibold mb-6">Genre Landscape</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {genreData.map((genre) => (
              <div
                key={genre.name}
                className="p-6 rounded-xl transition-all duration-300 hover:scale-105 cursor-pointer"
                style={{ backgroundColor: genre.fill }}
              >
                <div className="text-white text-center">
                  <div className="text-2xl font-heading font-bold mb-2">{genre.name}</div>
                  <div className="text-sm opacity-80">{Math.round((genre.size / 13000) * 100)}%</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default MusicalDNA;
