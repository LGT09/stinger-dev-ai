import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Moon, Sun, Monitor, Zap, LogOut, User, Share2, Copy, Upload } from "lucide-react";
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
  const { profile, user, signOut, refreshProfile, tokenBalance } = useAuth();
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("stinger-theme") as Theme) || "neon");
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [referralCopied, setReferralCopied] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setAvatarUrl(profile.avatar_url || "");
    }
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

  const updateProfile = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ display_name: displayName, avatar_url: avatarUrl }).eq("user_id", user.id);
    if (error) toast.error("Failed to update");
    else { toast.success("Profile updated"); refreshProfile(); }
  };

  const copyReferral = () => {
    if (!profile?.referral_code) return;
    const url = `${window.location.origin}?ref=${profile.referral_code}`;
    navigator.clipboard.writeText(url);
    setReferralCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setReferralCopied(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5">
      <p className="text-sm text-muted-foreground">Settings</p>

      {/* Theme */}
      <div className="glass rounded-xl p-4 space-y-3">
        <p className="text-xs font-medium text-foreground">Theme</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {themes.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTheme(id)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${theme === id ? "bg-primary/10 text-primary border border-primary/30" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Profile */}
      <div className="glass rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <User size={14} className="text-primary" />
          <p className="text-xs font-medium text-foreground">Profile</p>
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Email: {user?.email || "—"}</p>
          <p>Plan: {profile?.plan === "pro" ? "Pro ⭐" : "Free"}</p>
          <p>Tokens: {tokenBalance}</p>
          {profile?.is_verified && <p className="text-blue-400">✔ Verified Account</p>}
        </div>

        {/* Avatar URL */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Avatar URL</label>
          <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
        </div>

        {/* Display Name */}
        <div className="flex gap-2">
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display name" className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
          <button onClick={updateProfile} className="bg-primary text-primary-foreground px-3 py-2 rounded-lg text-xs font-medium">Save</button>
        </div>
      </div>

      {/* Referral */}
      <div className="glass rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Share2 size={14} className="text-primary" />
          <p className="text-xs font-medium text-foreground">Referral Program</p>
        </div>
        <p className="text-xs text-muted-foreground">Share your referral link. You get $3 tokens, they get $2 tokens when they sign up!</p>
        {profile?.referral_code && (
          <div className="flex gap-2 items-center">
            <code className="flex-1 bg-secondary rounded-lg px-3 py-2 text-xs text-foreground font-mono truncate">{profile.referral_code}</code>
            <button onClick={copyReferral} className="bg-primary text-primary-foreground px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1">
              <Copy size={12} /> {referralCopied ? "Copied!" : "Copy Link"}
            </button>
          </div>
        )}
      </div>

      {/* Upgrade */}
      <div className="glass rounded-xl p-4 space-y-3">
        <p className="text-xs font-medium text-foreground">Upgrade to Pro</p>
        <p className="text-xs text-muted-foreground">Get unlimited tokens and premium features. Contact admin to upgrade.</p>
        <a href="mailto:traxxiontech@gmail.com?subject=Stinger Dev Pro Upgrade" className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-medium hover:opacity-90">
          Request Upgrade →
        </a>
      </div>

      <button onClick={signOut} className="flex items-center gap-2 text-sm text-destructive hover:underline">
        <LogOut size={14} /> Sign out
      </button>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-xl p-4 space-y-2">
        <p className="text-xs font-medium text-foreground">Contact & Credits</p>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Developer: Vincent Ganiza — Traxxion Tech</p>
          <p>📧 traxxiontech@gmail.com</p>
          <p>📱 +263 716 857 999 / +263 780 078 177</p>
          <a href="https://www.facebook.com/TraxxionTech" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-block mt-1">Facebook →</a>
        </div>
      </motion.div>
    </div>
  );
};

export default SettingsPage;
