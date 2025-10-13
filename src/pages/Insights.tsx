import { Card } from "@/components/ui/card";
import { moodInsights } from "@/data/mockData";
import { TrendingUp, Brain, Sparkles, Moon } from "lucide-react";

const iconMap = [TrendingUp, Brain, Sparkles, Moon];

const Insights = () => {
  return (
    <div className="min-h-screen py-24 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12 animate-slide-up">
          <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4">
            Your Mood <span className="bg-gradient-sad bg-clip-text text-transparent">Insights</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Fascinating patterns discovered in your listening behavior
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {moodInsights.map((insight, index) => {
            const Icon = iconMap[index];
            return (
              <Card
                key={index}
                className="p-8 backdrop-blur-glass bg-glass-bg/50 border-glass-border hover:border-primary/50 transition-all duration-300 hover:scale-105 rounded-2xl animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-heading font-semibold mb-2">{insight.title}</h3>
                  </div>
                </div>
                
                <p className="text-muted-foreground leading-relaxed mb-4">
                  {insight.description}
                </p>
                
                <div className="px-4 py-3 rounded-lg bg-muted/50 border border-border">
                  <code className="text-sm text-primary font-mono">{insight.pattern}</code>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Additional insights section */}
        <Card className="mt-8 p-8 backdrop-blur-glass bg-glass-bg/50 border-glass-border rounded-2xl animate-slide-up" style={{ animationDelay: "0.4s" }}>
          <h3 className="text-2xl font-heading font-semibold mb-4">Understanding Your Patterns</h3>
          <p className="text-muted-foreground leading-relaxed mb-4">
            These insights are discovered using advanced association rule mining algorithms that analyze your listening history. 
            Each pattern represents a statistically significant relationship between your emotional states and your music choices.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            By understanding these patterns, you can make more intentional choices about the music you listen to, 
            using sound as a powerful tool for emotional regulation and personal wellbeing.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Insights;
