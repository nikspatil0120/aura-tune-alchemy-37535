import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Music2, Brain, TrendingUp, User, LogIn, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import LoginModal from "./LoginModal";

const Navigation = () => {
  const location = useLocation();
  const { isLoggedIn, logout, user } = useUser();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  
  const navItems = [
    { path: "/", label: "Home", icon: Music2 },
    { path: "/generator", label: "Generator", icon: Sparkles },
    { path: "/dna", label: "Musical DNA", icon: Brain },
    { path: "/insights", label: "Insights", icon: TrendingUp },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-glass bg-glass-bg/80 border-b border-glass-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-2xl font-heading font-bold bg-gradient-calm bg-clip-text text-transparent">
            <Music2 className="w-8 h-8 text-primary" />
            AuraTune
          </Link>
          
          <div className="flex items-center gap-2 md:gap-4">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${
                  location.pathname === path
                    ? "bg-primary/20 text-primary shadow-glow-calm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden md:inline">{label}</span>
              </Link>
            ))}
            
            {isLoggedIn ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                className="rounded-full hover:bg-primary/20 transition-all duration-300"
                title={`Logged in as ${user?.name}`}
              >
                <User className="w-5 h-5 text-primary" />
              </Button>
            ) : (
              <Button
                onClick={() => setIsLoginModalOpen(true)}
                className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 hover:border-primary/50 transition-all duration-300"
              >
                <LogIn className="w-4 h-4 mr-2" />
                <span className="hidden md:inline">Login</span>
              </Button>
            )}
          </div>
        </div>
      </div>
      
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </nav>
  );
};

export default Navigation;
