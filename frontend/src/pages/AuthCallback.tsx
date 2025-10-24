import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { Music2, CheckCircle, XCircle } from "lucide-react";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { login } = useUser();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Connecting to Spotify...');

  useEffect(() => {
    const handleAuth = async () => {
      const token = params.get("token");
      const error = params.get("error");
      
      if (error) {
        setStatus('error');
        setMessage(`Authentication failed: ${error}`);
        setTimeout(() => navigate("/", { replace: true }), 3000);
        return;
      }
      
      if (token) {
        try {
          setMessage('Saving authentication...');
          localStorage.setItem("auratune_token", token);
          
          setMessage('Loading your profile...');
          await login();
          
          setStatus('success');
          setMessage('Successfully connected to Spotify!');
          
          setTimeout(() => navigate("/", { replace: true }), 2000);
        } catch (error) {
          console.error('Auth callback error:', error);
          setStatus('error');
          setMessage('Failed to complete authentication');
          setTimeout(() => navigate("/", { replace: true }), 3000);
        }
      } else {
        setStatus('error');
        setMessage('No authentication token received');
        setTimeout(() => navigate("/", { replace: true }), 3000);
      }
    };

    handleAuth();
  }, [params, navigate, login]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="backdrop-blur-glass bg-glass-bg/50 border-glass-border p-8 rounded-3xl shadow-glow-calm max-w-md w-full mx-4">
        <div className="text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-calm mb-6 shadow-glow-calm">
            {status === 'loading' && <Music2 className="w-8 h-8 text-white animate-pulse" />}
            {status === 'success' && <CheckCircle className="w-8 h-8 text-green-400" />}
            {status === 'error' && <XCircle className="w-8 h-8 text-red-400" />}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-heading font-bold mb-4">
            {status === 'loading' && 'Connecting...'}
            {status === 'success' && 'Welcome to AuraTune!'}
            {status === 'error' && 'Connection Failed'}
          </h1>

          {/* Message */}
          <p className="text-muted-foreground mb-6">{message}</p>

          {/* Loading indicator */}
          {status === 'loading' && (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          {/* Success indicator */}
          {status === 'success' && (
            <div className="text-green-400 text-sm">
              Redirecting to your dashboard...
            </div>
          )}

          {/* Error indicator */}
          {status === 'error' && (
            <div className="text-red-400 text-sm">
              Redirecting to home page...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;


