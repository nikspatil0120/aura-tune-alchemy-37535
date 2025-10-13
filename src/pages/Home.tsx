import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Music, Sparkles, Brain, TrendingUp, ArrowRight, Heart, Zap } from "lucide-react";
import heroImage from "@/assets/hero-aurora.jpg";

const Home = () => {
  const navigate = useNavigate();

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
    { icon: Heart, title: "Select Your Mood", description: "Tell us how you're feeling right now" },
    { icon: Sparkles, title: "Set Your Goal", description: "Choose where you want to be emotionally" },
    { icon: Zap, title: "Receive Your Sonic Cure", description: "Get a personalized playlist journey" },
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
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: "0.1s" }}>
            AI-crafted playlists that understand how you feel, and how you want to feel.
          </p>
          
          <Button
            size="lg"
            onClick={() => navigate("/generator")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow-calm hover:shadow-glow-calm hover:scale-105 transition-all duration-300 text-lg px-8 py-6 rounded-2xl group animate-slide-up"
            style={{ animationDelay: "0.2s" }}
          >
            Begin Your Journey
            <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-float">
          <div className="w-8 h-12 rounded-full border-2 border-primary/50 flex items-start justify-center p-2">
            <div className="w-1.5 h-3 bg-primary rounded-full animate-pulse-glow"></div>
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
