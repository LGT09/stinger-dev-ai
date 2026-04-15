import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Moon, Sun, Monitor, Zap, LogOut, User, Share2, Copy, Upload, Camera, Waves, TreePine, Sunset } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Theme = "system" | "light" | "dark" | "neon" | "ocean" | "sunset" | "forest";

const themes: { id: Theme; label: string; icon: React.ElementType }[] = [
  { id: "system", label: "System", icon: Monitor },
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "neon", label: "Neon", icon: Zap },
  { id: "ocean", label: "Ocean", icon: Waves },
  { id: "sunset", label: "Sunset", icon: Sunset },
  { id: "forest", label: "Forest", icon: TreePine },
];

const SettingsPage = () => {
  const { profile, user, signOut, refreshProfile, tokenBalance } = useAuth();
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("stinger-theme") as Theme) || "neon");
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [referralCopied, setReferralCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (["neon", "ocean", "sunset", "forest"].includes(theme)) root.setAttribute("data-theme", theme);
    else if (theme === "dark") root.classList.add("dark");
    else if (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches) root.classList.add("dark");
  }, [theme]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File too large. Max 2MB.");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) {
      toast.error("Upload failed: " + uploadError.message);
      setUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(publicUrl);
    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", user.id);
    toast.success("Avatar uploaded!");
    refreshProfile();
    setUploading(false);
  };

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
      <div className="glass rounded-xl p-4 space-y-3 liquid-chrome">
        <p className="text-xs font-medium text-foreground">Theme</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {themes.map(({ id, label, icon: Icon }) => (
            <motion.button
              key={id}
              onClick={() => setTheme(id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${theme === id ? "bg-primary/10 text-primary border border-primary/30 glow-yellow" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
            >
              <Icon size={14} /> {label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Profile with Avatar Upload */}
      <div className="glass rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <User size={14} className="text-primary" />
          <p className="text-xs font-medium text-foreground">Profile</p>
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="w-16 h-16 rounded-full bg-secondary overflow-hidden border-2 border-primary/20 hover-glow transition-all">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <User size={24} />
                </div>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-110 transition-transform"
            >
              <Camera size={10} />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Email: {user?.email || "—"}</p>
            <p>Plan: {profile?.plan === "pro" ? "Pro ⭐" : "Free"}</p>
            <p>Tokens: {tokenBalance}</p>
            {profile?.is_verified && <p className="text-blue-400">✔ Verified Account</p>}
          </div>
        </div>
        {uploading && <p className="text-xs text-primary animate-pulse">Uploading avatar...</p>}

        {/* Display Name */}
        <div className="flex gap-2">
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display name" className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
          <button onClick={updateProfile} className="bg-primary text-primary-foreground px-3 py-2 rounded-lg text-xs font-medium btn-hover">Save</button>
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
            <code className="flex-1 bg-secondary rounded-lg px-3 py-2 text-xs text-foreground font-mono truncate">{`${window.location.origin}?ref=${profile.referral_code}`}</code>
            <button onClick={copyReferral} className="bg-primary text-primary-foreground px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1 btn-hover">
              <Copy size={12} /> {referralCopied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}
      </div>

      {/* Upgrade */}
      <div className="glass rounded-xl p-4 space-y-3 liquid-chrome-intense">
        <p className="text-xs font-medium text-foreground">Upgrade to Pro</p>
        <p className="text-xs text-muted-foreground">Get 5,000 tokens/month and premium features.</p>
        <div className="flex gap-2">
          <a href="mailto:info@stinger.indevs.in?subject=Stinger Dev Pro Upgrade" className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-medium hover:opacity-90 btn-hover">
            Request Upgrade →
          </a>
        </div>
      </div>

      <button onClick={signOut} className="flex items-center gap-2 text-sm text-destructive hover:underline hover:translate-x-1 transition-transform">
        <LogOut size={14} /> Sign out
      </button>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-xl p-4 space-y-2">
        <p className="text-xs font-medium text-foreground">Contact & Credits</p>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>🔥 Built by <span className="text-foreground font-medium">Vincent Ganiza</span> — Traxxion Tech</p>
          <p>📧 info@stinger.indevs.in | traxxiontech@gmail.com</p>
          <p>📱 +263 716 857 999 / +263 780 078 177</p>
          <a href="https://www.facebook.com/TraxxionTech" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-block mt-1">Facebook →</a>
        </div>
      </motion.div>
    </div>
  );
};

export default SettingsPage;
