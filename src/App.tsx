import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import SplashScreen from "@/components/SplashScreen";
import DashboardLayout from "@/layouts/DashboardLayout";
import Dashboard from "@/pages/Dashboard";
import AIStudio from "@/pages/AIStudio";
import Projects from "@/pages/Projects";
import Community from "@/pages/Community";
import Tokens from "@/pages/Tokens";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [splashVisible, setSplashVisible] = useState(true);

  // Apply saved theme on mount
  useEffect(() => {
    const saved = localStorage.getItem("stinger-theme") || "neon";
    const root = document.documentElement;
    root.classList.remove("dark");
    root.removeAttribute("data-theme");
    if (saved === "neon") root.setAttribute("data-theme", "neon");
    else if (saved === "dark") root.classList.add("dark");
    else if (saved === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      root.classList.add("dark");
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {showSplash && (
          <SplashScreen
            visible={splashVisible}
            onComplete={() => {
              setSplashVisible(false);
              setShowSplash(false);
            }}
          />
        )}
        {!showSplash && (
          <BrowserRouter>
            <Routes>
              <Route element={<DashboardLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/ai" element={<AIStudio />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/community" element={<Community />} />
                <Route path="/tokens" element={<Tokens />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
