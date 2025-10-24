import { Card } from "@/components/ui/card";
import { Music, Brain, TrendingUp, Heart, Zap, Sparkles, Waves, Star, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import SpotifyAuthButton from "@/components/SpotifyAuthButton";
import heroImage from "@/assets/hero-aurora.jpg";

const Home = () => {
  const { isLoggedIn } = useUser();
  const navigate = useNavigate();

  const handleStartJourney = () => {
    if (isLoggedIn) {
      navigate('/generator');
    } else {
      // Will be handled by SpotifyAuthButton
      return;
    }
  };

  const features = [
    {
      icon: Music,
      title: "Therapeutic Playlists",
      description: "AI-curated soundscapes designed to guide you from your current emotional state to your desired mindset.",
      gradient: "gradient-calm",
    },
    {
      icon: Brain,
      title: "Your Musical DNA",
      description: "Discover the unique audio fingerprint that defines your listening personality and preferences.",
      gradient: "gradient-happy",
    },
    {
      icon: TrendingUp,
      title: "Mood Transition Insights",
      description: "Understand the patterns in how you use music to navigate your emotional landscape.",
      gradient: "gradient-sad",
    },
  ];

  const steps = [
    { icon: Heart, title: "Share Your Mood", description: "Tell Aura how you're feeling" },
    { icon: Zap, title: "Set Your Goal", description: "Choose your desired emotional state" },
    { icon: Music, title: "Receive Your Playlist", description: "Get a personalized therapeutic journey" },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Ultra Vibrant Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-40 h-40 bg-accent-cyan/10 rounded-full blur-3xl pulse-glow sparkle-effect"></div>
        <div className="absolute top-40 right-20 w-32 h-32 bg-accent-purple/15 rounded-full blur-2xl beat-pulse"></div>
        <div className="absolute bottom-20 left-1/3 w-48 h-48 bg-accent-pink/12 rounded-full blur-3xl pulse-glow"></div>
        <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-accent-yellow/10 rounded-full blur-xl float-animation"></div>
        <div className="absolute bottom-40 right-10 w-36 h-36 bg-accent-lime/8 rounded-full blur-2xl melody-wave"></div>
        <div className="absolute top-20 left-1/2 w-20 h-20 bg-accent-orange/8 rounded-full blur-xl beat-pulse"></div>
      </div>

      {/* Hero Section */}
      <section 
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage: `url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background"></div>
        
        <div className="relative z-10 container mx-auto px-4 text-center">
          {/* Animated Music Visualizer */}
          <div className="flex justify-center mb-8 float-animation">
            <div className="music-bars">
              <div className="music-bar"></div>
              <div className="music-bar"></div>
              <div className="music-bar"></div>
              <div className="music-bar"></div>
              <div className="music-bar"></div>
              <div className="music-bar"></div>
              <div className="music-bar"></div>
            </div>
          </div>

          <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold mb-8 gradient-text sparkle-effect float-animation">
            🎵 Tune Your Aura ✨
          </h1>
          
          <p className="text-2xl md:text-3xl text-foreground/90 mb-6 max-w-4xl mx-auto leading-relaxed float-animation" style={{ animationDelay: "0.2s" }}>
            🌈 AI-powered therapeutic playlists that understand your emotions and guide your healing journey
          </p>

          <p className="text-lg md:text-xl text-accent-cyan mb-12 max-w-2xl mx-auto float-animation" style={{ animationDelay: "0.4s" }}>
            💙 Transform your mood through the power of personalized music therapy
          </p>
          
          {/* Dynamic CTA Button */}
          <div className="float-animation" style={{ animationDelay: "0.6s" }}>
            {isLoggedIn ? (
              <Link to="/generator">
                <button className="btn-vibrant text-2xl px-12 py-6 sparkle-effect interactive-hover">
                  🚀 Continue Your Journey ✨
                </button>
              </Link>
            ) : (
              <div className="space-y-4">
                <SpotifyAuthButton 
                  onSuccess={() => navigate('/generator')}
                />
                <p className="text-sm text-foreground/60">
                  🎵 Connect with Spotify to unlock your personalized therapeutic music experience
                </p>
              </div>
            )}
          </div>

          {/* Floating Feature Icons */}
          <div className="flex justify-center space-x-8 mt-16 float-animation" style={{ animationDelay: "0.8s" }}>
            <div className="glass-card interactive-hover neon-glow p-4">
              <Brain className="w-8 h-8 text-accent-cyan mx-auto mb-2" />
              <div className="text-sm font-bold text-accent-cyan">AI Powered</div>
            </div>
            <div className="glass-card interactive-hover neon-glow p-4">
              <Heart className="w-8 h-8 text-accent-pink mx-auto mb-2" />
              <div className="text-sm font-bold text-accent-pink">Therapeutic</div>
            </div>
            <div className="glass-card interactive-hover neon-glow p-4">
              <Sparkles className="w-8 h-8 text-accent-purple mx-auto mb-2" />
              <div className="text-sm font-bold text-accent-purple">Personalized</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4 relative z-10">
        <div className="container mx-auto">
          <div className="text-center mb-20 float-animation">
            <h2 className="text-5xl md:text-6xl font-bold gradient-text mb-6 sparkle-effect">
              🎯 How It Works
            </h2>
            <p className="text-xl text-foreground/80 max-w-2xl mx-auto">
              Your journey to emotional wellness through AI-powered music therapy
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12 max-w-6xl mx-auto">
            {steps.map((step, index) => (
              <div key={index} className="text-center glass-card interactive-hover neon-glow p-8 float-animation" style={{ animationDelay: `${index * 0.2}s` }}>
                <div className="relative mb-8">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent-cyan via-accent-purple to-accent-pink flex items-center justify-center neon-glow pulse-glow sparkle-effect mx-auto">
                    <step.icon className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-accent-yellow rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{index + 1}</span>
                  </div>
                </div>
                <h3 className="text-2xl font-bold gradient-text mb-4">{step.title}</h3>
                <p className="text-foreground/70 text-lg leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>

          {/* Connection Lines */}
          <div className="hidden md:flex justify-center items-center mt-12 space-x-8">
            <div className="w-24 h-1 bg-gradient-to-r from-accent-cyan to-accent-purple rounded-full"></div>
            <Waves className="w-6 h-6 text-accent-purple" />
            <div className="w-24 h-1 bg-gradient-to-r from-accent-purple to-accent-pink rounded-full"></div>
          </div>
        </div>
      </section>

      {/* Features Showcase */}
      <section className="py-24 px-4 relative z-10">
        <div className="container mx-auto">
          <div className="text-center mb-20 float-animation">
            <h2 className="text-5xl md:text-6xl font-bold gradient-text mb-6 sparkle-effect">
              ✨ Features That Understand You
            </h2>
            <p className="text-xl text-foreground/80 max-w-3xl mx-auto">
              Discover the advanced AI capabilities that make your therapeutic music experience truly personal
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="glass-card rainbow-border pulse-glow p-8 interactive-hover melody-wave float-animation"
                style={{ animationDelay: `${index * 0.3}s` }}
              >
                <div className="relative mb-8">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-cyan via-accent-purple to-accent-pink flex items-center justify-center neon-glow pulse-glow sparkle-effect`}>
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-accent-lime rounded-full flex items-center justify-center">
                    <Star className="w-3 h-3 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold gradient-text mb-4 sparkle-effect">{feature.title}</h3>
                <p className="text-foreground/80 leading-relaxed text-lg">{feature.description}</p>
                
                {/* Feature Tags */}
                <div className="flex flex-wrap gap-2 mt-6">
                  {index === 0 && (
                    <>
                      <span className="px-3 py-1 bg-accent-cyan/20 text-accent-cyan rounded-full text-sm font-medium">🎵 AI-Curated</span>
                      <span className="px-3 py-1 bg-accent-purple/20 text-accent-purple rounded-full text-sm font-medium">🧠 Therapeutic</span>
                    </>
                  )}
                  {index === 1 && (
                    <>
                      <span className="px-3 py-1 bg-accent-pink/20 text-accent-pink rounded-full text-sm font-medium">🧬 Unique Profile</span>
                      <span className="px-3 py-1 bg-accent-orange/20 text-accent-orange rounded-full text-sm font-medium">📊 Data-Driven</span>
                    </>
                  )}
                  {index === 2 && (
                    <>
                      <span className="px-3 py-1 bg-accent-lime/20 text-accent-lime rounded-full text-sm font-medium">📈 Pattern Analysis</span>
                      <span className="px-3 py-1 bg-accent-sky/20 text-accent-sky rounded-full text-sm font-medium">🔮 Insights</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-24 px-4 relative z-10">
        <div className="container mx-auto text-center">
          <div className="glass-card rainbow-border pulse-glow p-12 max-w-4xl mx-auto">
            <div className="mb-8">
              <Headphones className="w-20 h-20 mx-auto text-accent-cyan neon-glow pulse-glow mb-6" />
              <h2 className="text-4xl md:text-5xl font-bold gradient-text mb-6 sparkle-effect">
                🎵 Ready to Transform Your Mood? ✨
              </h2>
              <p className="text-xl text-foreground/80 mb-8 max-w-2xl mx-auto">
                Join thousands who have discovered the healing power of AI-personalized music therapy
              </p>
            </div>

            {isLoggedIn ? (
              <Link to="/generator">
                <button className="btn-vibrant text-xl px-10 py-5 sparkle-effect interactive-hover">
                  🚀 Start Creating Playlists ✨
                </button>
              </Link>
            ) : (
              <div className="space-y-4">
                <SpotifyAuthButton 
                  onSuccess={() => navigate('/generator')}
                />
                <p className="text-sm text-foreground/60">
                  🎵 Connect with Spotify to begin your therapeutic music journey
                </p>
              </div>
            )}

            <div className="flex justify-center space-x-8 mt-12">
              <div className="text-center">
                <div className="text-3xl font-bold gradient-text">AI</div>
                <div className="text-sm text-foreground/70">Powered</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold gradient-text">24/7</div>
                <div className="text-sm text-foreground/70">Available</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold gradient-text">∞</div>
                <div className="text-sm text-foreground/70">Possibilities</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
