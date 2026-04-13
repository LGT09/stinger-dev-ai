import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import SplashScreen from "@/components/SplashScreen";
import CookieConsent from "@/components/CookieConsent";
import DashboardLayout from "@/layouts/DashboardLayout";
import AuthPage from "@/pages/AuthPage";
import Dashboard from "@/pages/Dashboard";
import AIStudio from "@/pages/AIStudio";
import Projects from "@/pages/Projects";
import Community from "@/pages/Community";
import Tokens from "@/pages/Tokens";
import SettingsPage from "@/pages/SettingsPage";
import AdminDashboard from "@/pages/AdminDashboard";
import ResetPassword from "@/pages/ResetPassword";
import SharedChat from "@/pages/SharedChat";
import NotFound from "@/pages/NotFound";
import { ShieldAlert, Mail } from "lucide-react";

const queryClient = new QueryClient();

const BannedScreen = ({ reason }: { reason?: string | null }) => (
  <div className="min-h-screen bg-background flex items-center justify-center p-4" data-theme="neon">
    <div className="glass rounded-2xl p-8 max-w-md text-center">
      <ShieldAlert size={48} className="text-destructive mx-auto mb-4" />
      <p className="text-base font-semibold text-foreground mb-2">Account Suspended</p>
      <p className="text-sm text-muted-foreground mb-2">Your account has been banned or suspended.</p>
      {reason && <p className="text-xs text-destructive/80 italic mb-4">Reason: {reason}</p>}
      <a href="mailto:traxxiontech@gmail.com?subject=Account Appeal" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90">
        <Mail size={14} /> Contact Support
      </a>
    </div>
  </div>
);

const AppContent = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [splashVisible, setSplashVisible] = useState(true);
  const { session, loading, profile } = useAuth();

  useEffect(() => {
    const saved = localStorage.getItem("stinger-theme") || "neon";
    const root = document.documentElement;
    root.classList.remove("dark");
    root.removeAttribute("data-theme");
    if (saved === "neon") root.setAttribute("data-theme", "neon");
    else if (saved === "dark") root.classList.add("dark");
    else if (saved === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches) root.classList.add("dark");
  }, []);

  if (showSplash) {
    return (
      <SplashScreen visible={splashVisible} onComplete={() => { setSplashVisible(false); setShowSplash(false); }} />
    );
  }

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse text-primary text-sm">Loading...</div></div>;
  }

  if (!session) return <AuthPage />;

  // Check banned/suspended
  if (profile?.is_banned || profile?.is_suspended) {
    return <BannedScreen reason={profile?.ban_reason} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/shared/:code" element={<SharedChat />} />
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/ai" element={<AIStudio />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/community" element={<Community />} />
          <Route path="/tokens" element={<Tokens />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
      <CookieConsent />
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
