import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Music2, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface SpotifyAuthButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const SpotifyAuthButton = ({ onSuccess, onError }: SpotifyAuthButtonProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'success' | 'error'>('idle');

  const handleSpotifyAuth = async () => {
    // Prevent multiple simultaneous requests
    if (isConnecting) return;
    
    setIsConnecting(true);
    setConnectionStatus('connecting');
    
    try {
      // Force 127.0.0.1 backend regardless of environment
      const backend = "http://127.0.0.1:8000";
      
      // Simple redirect without health check to avoid repeated requests
      toast.success("Redirecting to Spotify...");
      setConnectionStatus('success');
      onSuccess?.();
      
      // Small delay to show the success state, then redirect
      setTimeout(() => {
        window.location.href = `${backend}/auth/login/spotify`;
      }, 500);
      
    } catch (error) {
      console.error('Spotify auth error:', error);
      setConnectionStatus('error');
      
      const errorMessage = "Failed to connect to Spotify";
      toast.error(errorMessage);
      onError?.(errorMessage);
      
      // Reset status after 3 seconds
      setTimeout(() => {
        setConnectionStatus('idle');
        setIsConnecting(false);
      }, 3000);
    }
  };

  const getButtonContent = () => {
    switch (connectionStatus) {
      case 'connecting':
        return (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
            Connecting...
          </>
        );
      case 'success':
        return (
          <>
            <CheckCircle className="w-4 h-4 mr-2" />
            Redirecting...
          </>
        );
      case 'error':
        return (
          <>
            <AlertCircle className="w-4 h-4 mr-2" />
            Connection Failed
          </>
        );
      default:
        return (
          <>
            <Music2 className="w-4 h-4 mr-2" />
            Connect with Spotify
          </>
        );
    }
  };

  const getButtonVariant = () => {
    switch (connectionStatus) {
      case 'error':
        return 'destructive' as const;
      case 'success':
        return 'default' as const;
      default:
        return 'default' as const;
    }
  };

  const getButtonClassName = () => {
    const baseClass = "transition-all duration-300";
    
    switch (connectionStatus) {
      case 'connecting':
        return `${baseClass} bg-blue-600 hover:bg-blue-700 text-white`;
      case 'success':
        return `${baseClass} bg-green-600 hover:bg-green-700 text-white`;
      case 'error':
        return `${baseClass} bg-red-600 hover:bg-red-700 text-white`;
      default:
        return `${baseClass} bg-[#1DB954] hover:bg-[#1DB954]/90 text-white`;
    }
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleSpotifyAuth}
        disabled={isConnecting}
        variant={getButtonVariant()}
        className={getButtonClassName()}
        size="lg"
      >
        {getButtonContent()}
      </Button>
      
      {connectionStatus === 'error' && (
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Troubleshooting tips:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Check if backend server is running on port 8000</li>
            <li>Verify your internet connection</li>
            <li>Try refreshing the page</li>
            <li>Check browser console for detailed errors</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default SpotifyAuthButton;