import { Card } from "@/components/ui/card";
import { Music, Brain, TrendingUp, Heart, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-aurora.jpg";

const Home = () => {

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
    <div className="min-h-screen">
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
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-heading font-bold mb-6 animate-slide-up">
            Tune Your <span className="bg-gradient-calm bg-clip-text text-transparent">Aura</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: "0.1s" }}>
            AI-crafted playlists that understand how you feel, and how you want to feel.
          </p>
          
          <div className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <Link to="/generator">
              <Button
                size="lg"
                className="bg-gradient-happy hover:opacity-90 text-white font-semibold px-8 py-6 text-lg rounded-xl shadow-glow-happy hover:scale-105 transition-all duration-300"
              >
                Begin Your Journey
              </Button>
            </Link>
          </div>
        </div>

      </section>

      {/* How It Works */}
      <section className="py-24 px-4">
        <div className="container mx-auto">
          <h2 className="text-4xl md:text-5xl font-heading font-bold text-center mb-16">
            How It Works
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 text-primary mb-6 shadow-glow-calm">
                  <step.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-heading font-semibold mb-3">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Showcase */}
      <section className="py-24 px-4 bg-muted/30">
        <div className="container mx-auto">
          <h2 className="text-4xl md:text-5xl font-heading font-bold text-center mb-16">
            Features That Understand You
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="p-8 backdrop-blur-glass bg-glass-bg/50 border-glass-border hover:border-primary/50 transition-all duration-300 hover:shadow-glow-calm hover:scale-105 rounded-2xl"
              >
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-${feature.gradient} mb-6`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-heading font-semibold mb-4">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
