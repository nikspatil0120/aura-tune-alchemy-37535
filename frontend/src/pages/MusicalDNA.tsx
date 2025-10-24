import { useState, useEffect } from "react";
import { Brain, Music, Headphones, Zap, Heart, Waves, TrendingUp, Star } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from "recharts";
import { useUser } from "@/contexts/UserContext";
import { apiFetch } from "@/lib/api";

const MusicalDNA = () => {
  const { user, isLoggedIn } = useUser();
  const [dnaData, setDnaData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMusicalDNA = async () => {
      try {
        const backend = (import.meta as any).env?.VITE_BACKEND_URL || "http://127.0.0.1:8000";
        const response = await apiFetch(`${backend}/user/musical-dna`);
        
        if (response.ok) {
          const data = await response.json();
          setDnaData(data);
        } else {
          // Fallback to generated data
          setDnaData({
            archetype: {
              name: "The Emotional Alchemist",
              description: "Music is your tool for transformation. You masterfully use sound to shift between emotional states, turning challenges into catalysts for growth."
            },
            audio_features: [
              { feature: "Valence", value: 65, fullMark: 100 },
              { feature: "Energy", value: 70, fullMark: 100 },
              { feature: "Danceability", value: 55, fullMark: 100 },
              { feature: "Acousticness", value: 45, fullMark: 100 },
              { feature: "Tempo", value: 75, fullMark: 100 },
            ],
            genres: [
              { name: "Electronic", size: 3500, fill: "hsl(var(--primary))" },
              { name: "Pop", size: 2800, fill: "hsl(var(--secondary))" },
              { name: "Indie", size: 2200, fill: "hsl(var(--accent))" },
              { name: "Alternative", size: 1800, fill: "hsl(177, 73%, 40%)" },
              { name: "Rock", size: 1500, fill: "hsl(250, 60%, 50%)" },
              { name: "Ambient", size: 1200, fill: "hsl(320, 80%, 45%)" },
            ],
            total_tracks_analyzed: 0
          });
        }
      } catch (error) {
        console.error('Failed to fetch musical DNA:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMusicalDNA();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen py-24 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Analyzing your musical DNA...</p>
        </div>
      </div>
    );
  }

  if (!dnaData) {
    return <div>Error loading musical DNA</div>;
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
          <div className="relative inline-block mb-6">
            <Brain className="w-20 h-20 mx-auto text-accent-cyan neon-glow pulse-glow" />
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-accent-pink rounded-full flex items-center justify-center sparkle-effect">
              <Zap className="w-4 h-4 text-white" />
            </div>
          </div>
          <h1 className="text-6xl font-bold gradient-text mb-6 sparkle-effect">
            🧬 {isLoggedIn && user ? `${user.name}'s` : "Your"} Musical DNA ✨
          </h1>
          <p className="text-2xl text-foreground/80 max-w-3xl mx-auto mb-8">
            🎵 Discover the unique sonic fingerprint that defines your musical soul
          </p>
          
          {/* Stats Overview */}
          <div className="flex justify-center space-x-8 mb-8">
            <div className="glass-card interactive-hover neon-glow px-6 py-4">
              <div className="flex items-center space-x-3">
                <Music className="w-6 h-6 text-accent-cyan" />
                <div>
                  <div className="text-2xl font-bold gradient-text">DNA</div>
                  <div className="text-sm text-foreground/70">Analyzed</div>
                </div>
              </div>
            </div>
            <div className="glass-card interactive-hover neon-glow px-6 py-4">
              <div className="flex items-center space-x-3">
                <Headphones className="w-6 h-6 text-accent-purple" />
                <div>
                  <div className="text-2xl font-bold gradient-text">Unique</div>
                  <div className="text-sm text-foreground/70">Profile</div>
                </div>
              </div>
            </div>
            <div className="glass-card interactive-hover neon-glow px-6 py-4">
              <div className="flex items-center space-x-3">
                <Heart className="w-6 h-6 text-accent-pink" />
                <div>
                  <div className="text-2xl font-bold gradient-text">Personal</div>
                  <div className="text-sm text-foreground/70">Insights</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Musical Archetype */}
        <div className="glass-card rainbow-border pulse-glow p-8 melody-wave">
          <div className="text-center">
            <div className="relative inline-block mb-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent-cyan via-accent-purple to-accent-pink flex items-center justify-center neon-glow pulse-glow sparkle-effect">
                <span className="text-4xl">🎭</span>
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-accent-yellow rounded-full flex items-center justify-center">
                <Star className="w-4 h-4 text-white" />
              </div>
            </div>
            <h2 className="text-4xl font-bold gradient-text mb-4 sparkle-effect">{dnaData.archetype.name}</h2>
            <p className="text-xl text-foreground/80 leading-relaxed max-w-3xl mx-auto mb-6">
              {dnaData.archetype.description}
            </p>
            
            {/* Archetype Traits */}
            <div className="flex flex-wrap justify-center gap-3 mb-6">
              <span className="px-4 py-2 bg-accent-cyan/20 text-accent-cyan rounded-full border border-accent-cyan/30 font-bold">
                🎵 Emotionally Driven
              </span>
              <span className="px-4 py-2 bg-accent-purple/20 text-accent-purple rounded-full border border-accent-purple/30 font-bold">
                🌊 Mood Transformer
              </span>
              <span className="px-4 py-2 bg-accent-pink/20 text-accent-pink rounded-full border border-accent-pink/30 font-bold">
                ✨ Sonic Alchemist
              </span>
            </div>
            
            {dnaData.total_tracks_analyzed > 0 && (
              <p className="text-lg text-accent-lime font-medium">
                🔬 Based on analysis of {dnaData.total_tracks_analyzed} of your top tracks
              </p>
            )}
          </div>
        </div>

        {/* Audio Features Radar */}
        <div className="glass-card neon-glow interactive-hover p-8">
          <div className="text-center mb-8">
            <h3 className="text-3xl font-bold gradient-text mb-4 sparkle-effect">
              🎚️ Your Sonic Signature
            </h3>
            <p className="text-lg text-foreground/70">
              The unique audio characteristics that define your musical taste
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={dnaData.audio_features}>
                  <PolarGrid stroke="hsl(var(--accent-cyan))" strokeOpacity={0.3} />
                  <PolarAngleAxis 
                    dataKey="feature" 
                    tick={{ fill: "hsl(var(--foreground))", fontSize: 14, fontWeight: 'bold' }}
                  />
                  <PolarRadiusAxis 
                    angle={90} 
                    domain={[0, 100]}
                    tick={{ fill: "hsl(var(--accent-cyan))", fontSize: 12 }}
                  />
                  <Radar 
                    name="Your Profile" 
                    dataKey="value" 
                    stroke="hsl(var(--accent-cyan))" 
                    fill="hsl(var(--accent-purple))" 
                    fillOpacity={0.3}
                    strokeWidth={3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-4">
              {dnaData.audio_features.map((feature, index) => (
                <div key={feature.feature} className="glass-card interactive-hover p-4" style={{animationDelay: `${index * 0.1}s`}}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-lg text-foreground">{feature.feature}</span>
                    <span className="text-2xl font-bold gradient-text">{feature.value}%</span>
                  </div>
                  <div className="progress-vibrant">
                    <div className="progress-fill" style={{ width: `${feature.value}%` }}></div>
                  </div>
                  <div className="mt-2 text-sm text-foreground/60">
                    {feature.feature === 'Valence' && 'How positive and uplifting your music feels'}
                    {feature.feature === 'Energy' && 'The intensity and power in your tracks'}
                    {feature.feature === 'Danceability' && 'How much your music makes you move'}
                    {feature.feature === 'Acousticness' && 'Your preference for organic vs electronic sounds'}
                    {feature.feature === 'Tempo' && 'The speed and rhythm of your musical choices'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Genre Universe */}
        <div className="glass-card rainbow-border pulse-glow p-8">
          <div className="text-center mb-8">
            <h3 className="text-3xl font-bold gradient-text mb-4 sparkle-effect">
              🌌 Your Musical Universe
            </h3>
            <p className="text-lg text-foreground/70">
              The genres that shape your sonic landscape
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Genre Pie Chart */}
            <div className="flex justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dnaData.genres}
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="size"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {dnaData.genres.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Genre Cards */}
            <div className="space-y-3">
              {dnaData.genres.map((genre, index) => (
                <div
                  key={genre.name}
                  className="glass-card interactive-hover p-4 border-l-4 transition-all duration-300"
                  style={{ 
                    borderLeftColor: genre.fill,
                    animationDelay: `${index * 0.1}s`
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: genre.fill }}
                      ></div>
                      <span className="font-bold text-lg text-foreground">{genre.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold gradient-text">
                        {Math.round((genre.size / 13000) * 100)}%
                      </div>
                      <div className="text-sm text-foreground/60">of your taste</div>
                    </div>
                  </div>
                  <div className="mt-2 progress-vibrant">
                    <div 
                      className="progress-fill" 
                      style={{ 
                        width: `${(genre.size / 13000) * 100}%`,
                        backgroundColor: genre.fill
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Musical Insights */}
        <div className="glass-card neon-glow melody-wave p-8">
          <div className="text-center mb-8">
            <h3 className="text-3xl font-bold gradient-text mb-4 sparkle-effect">
              🔮 Musical Insights
            </h3>
            <p className="text-lg text-foreground/70">
              What your musical DNA reveals about you
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="glass-card interactive-hover p-6 text-center">
              <Waves className="w-12 h-12 mx-auto mb-4 text-accent-cyan neon-glow" />
              <h4 className="text-xl font-bold gradient-text mb-2">Emotional Range</h4>
              <p className="text-foreground/70">
                Your music spans a wide emotional spectrum, showing deep emotional intelligence
              </p>
            </div>
            
            <div className="glass-card interactive-hover p-6 text-center">
              <TrendingUp className="w-12 h-12 mx-auto mb-4 text-accent-purple neon-glow" />
              <h4 className="text-xl font-bold gradient-text mb-2">Growth Mindset</h4>
              <p className="text-foreground/70">
                You use music as a tool for personal transformation and emotional growth
              </p>
            </div>
            
            <div className="glass-card interactive-hover p-6 text-center">
              <Heart className="w-12 h-12 mx-auto mb-4 text-accent-pink neon-glow" />
              <h4 className="text-xl font-bold gradient-text mb-2">Empathic Nature</h4>
              <p className="text-foreground/70">
                Your musical choices reflect high empathy and emotional awareness
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicalDNA;
