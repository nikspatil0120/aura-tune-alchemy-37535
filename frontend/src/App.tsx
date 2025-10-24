import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { UserProvider, useUser } from "./contexts/UserContext";
import Navigation from "./components/Navigation";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Generator from "./pages/Generator";
import MusicalDNA from "./pages/MusicalDNA";
import Insights from "./pages/Insights";
import NotFound from "./pages/NotFound";
import AuthCallback from "./pages/AuthCallback";
import Profile from "./pages/Profile";

const queryClient = new QueryClient();

const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const { isLoggedIn } = useUser();
  if (!isLoggedIn) return <Navigate to="/" replace />;
  return children;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <UserProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen bg-background text-foreground">
            <Navigation />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/generator" element={<RequireAuth><Generator /></RequireAuth>} />
              <Route path="/dna" element={<RequireAuth><MusicalDNA /></RequireAuth>} />
              <Route path="/insights" element={<RequireAuth><Insights /></RequireAuth>} />
              <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Footer />
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </UserProvider>
  </QueryClientProvider>
);

export default App;
