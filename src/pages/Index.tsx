import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Landing from "./Landing";
import Dashboard from "./Dashboard";
import AuthPage from "./AuthPage";

const Index = () => {
  const { session } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  // Authenticated: show dashboard
  if (session) return <Dashboard />;

  // Anonymous: show auth or landing overview
  if (showAuth) return <AuthPage />;
  return <Landing onGetStarted={() => setShowAuth(true)} />;
};

export default Index;
