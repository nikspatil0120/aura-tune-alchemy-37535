import { Music2, Heart } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card/50 backdrop-blur-glass mt-20">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Music2 className="w-6 h-6 text-primary" />
            <span className="font-heading font-bold text-xl">AuraTune</span>
          </div>
          
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            Crafted with <Heart className="w-4 h-4 text-accent fill-accent" /> for your sonic wellbeing
          </p>
          
          <div className="text-sm text-muted-foreground">
            © 2025 AuraTune. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
