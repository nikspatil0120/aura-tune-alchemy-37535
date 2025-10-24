import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser } from "@/contexts/UserContext";
import { Music2, X } from "lucide-react";
import SpotifyAuthButton from "./SpotifyAuthButton";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LoginModal = ({ isOpen, onClose }: LoginModalProps) => {
  const { login } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login();
    onClose();
  };



  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="backdrop-blur-glass bg-glass-bg/95 border-glass-border max-w-md p-0 overflow-hidden rounded-3xl shadow-glow-calm">
        <DialogTitle className="sr-only">Login</DialogTitle>
        <DialogDescription className="sr-only">Login to AuraTune using Spotify.</DialogDescription>
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 hover:bg-muted/50 transition-all duration-300 z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-calm mb-4 shadow-glow-calm">
              <Music2 className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-heading font-bold mb-2">Welcome Back</h2>
            <p className="text-muted-foreground">Tune in to your perfect soundscape</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background/50 border-glass-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl transition-all duration-300"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-background/50 border-glass-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl transition-all duration-300"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-happy hover:opacity-90 text-white font-semibold py-6 rounded-xl shadow-glow-happy transition-all duration-300 hover:scale-105"
            >
              Login
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-glass-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-glass-bg px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          {/* Social Login Buttons */}
          <div className="space-y-3">
            <SpotifyAuthButton 
              onSuccess={() => onClose()}
              onError={(error) => console.error('Spotify auth error:', error)}
            />
          </div>

          {/* Footer Links */}
          <div className="mt-6 text-center space-y-2">
            <button className="text-sm text-primary hover:underline transition-all duration-300">
              Forgot Password?
            </button>
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <button className="text-primary hover:underline transition-all duration-300">
                Sign Up
              </button>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoginModal;
