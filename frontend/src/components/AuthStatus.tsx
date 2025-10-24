import { useUser } from "@/contexts/UserContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Music2, User, AlertCircle, CheckCircle } from "lucide-react";

const AuthStatus = () => {
  const { isLoggedIn, isLoading, spotifyUser, user } = useUser();

  if (isLoading) {
    return (
      <Badge variant="secondary" className="bg-muted/50">
        <div className="animate-spin rounded-full h-3 w-3 border-b border-current mr-2"></div>
        Loading...
      </Badge>
    );
  }

  if (!isLoggedIn) {
    return (
      <Badge variant="outline" className="border-orange-500/50 text-orange-500">
        <AlertCircle className="w-3 h-3 mr-1" />
        Not Connected
      </Badge>
    );
  }

  if (spotifyUser) {
    return (
      <Badge className="bg-[#1DB954]/20 text-[#1DB954] border-[#1DB954]/30">
        <CheckCircle className="w-3 h-3 mr-1" />
        Spotify Connected
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="bg-blue-500/20 text-blue-500 border-blue-500/30">
      <User className="w-3 h-3 mr-1" />
      Demo Mode
    </Badge>
  );
};

export default AuthStatus;