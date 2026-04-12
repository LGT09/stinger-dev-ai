import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Moon, Sun, Monitor, Zap, LogOut, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Theme = "system" | "light" | "dark" | "neon";

const themes: { id: Theme; label: string; icon: React.ElementType }[] = [
  { id: "system", label: "System", icon: Monitor },
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "neon", label: "Neon", icon: Zap },
];

const SettingsPage = () => {
  const { profile, user, signOut, refreshProfile } = useAuth();
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("stinger-theme") as Theme) || "neon";
  });
  const [displayName, setDisplayName] = useState(profile?.display_name || "");

  useEffect(() => {
    if (profile) setDisplayName(profile.display_name || "");
  }, [profile]);

  useEffect(() => {
    const root = document.documentElement;
    localStorage.setItem("stinger-theme", theme);
    root.classList.remove("dark");
    root.removeAttribute("data-theme");
    if (theme === "neon") root.setAttribute("data-theme", "neon");
    else if (theme === "dark") root.classList.add("dark");
    else if (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches) root.classList.add("dark");
  }, [theme]);

  const updateName = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ display_name: displayName }).eq("user_id", user.id);
    if (error) toast.error("Failed to update");
    else {
      toast.success("Profile updated");
      refreshProfile();
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <p className="text-sm text-muted-foreground">Settings</p>

      <div className="glass rounded-xl p-5 space-y-4">
        <p className="text-sm font-medium text-foreground">Theme</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {themes.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTheme(id)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                theme === id
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="glass rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <User size={14} className="text-primary" />
          <p className="text-sm font-medium text-foreground">Account</p>
        </div>
        <div className="text-xs text-muted-foreground space-y-2">
          <p>Email: {user?.email || "—"}</p>
          <p>Plan: {profile?.plan === "pro" ? "Pro ⭐" : "Free"}</p>
          {profile?.is_verified && <p className="text-blue-400">✔ Verified Account</p>}
        </div>
        <div className="flex gap-2">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Display name"
            className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <button onClick={updateName} className="bg-primary text-primary-foreground px-3 py-2 rounded-lg text-xs font-medium">Save</button>
        </div>
      </div>

      <button
        onClick={signOut}
        className="flex items-center gap-2 text-sm text-destructive hover:underline"
      >
        <LogOut size={14} /> Sign out
      </button>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-xl p-5 space-y-3">
        <p className="text-sm font-medium text-foreground">Contact</p>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Developer: Vincent Ganiza — Traxxion Tech</p>
          <p>📧 traxxiontech@gmail.com</p>
          <p>📱 +263 716 857 999 / +263 780 078 177</p>
          <a href="https://www.facebook.com/TraxxionTech" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-block mt-1">
            Facebook →
          </a>
        </div>
      </motion.div>
    </div>
  );
};

export default SettingsPage;
