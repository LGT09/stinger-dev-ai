import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Moon, Sun, Monitor, Zap, LogOut, User, Share2, Copy, Camera, Waves, TreePine, Sunset, GitBranch, ExternalLink, Fingerprint, Activity, Trash2, MapPin, Smartphone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { registerPasskey, supportsBiometric } from "@/lib/biometric";

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
  const [githubToken, setGithubToken] = useState(() => localStorage.getItem("github_token") || "");
  const [githubConnected, setGithubConnected] = useState(() => !!localStorage.getItem("github_token"));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [passkeys, setPasskeys] = useState<any[]>([]);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setAvatarUrl(profile.avatar_url || "");
    }
  }, [profile]);

  const loadSessions = async () => {
    if (!user) return;
    const [s, a, p] = await Promise.all([
      supabase.from("user_sessions").select("*").eq("user_id", user.id).order("last_seen_at", { ascending: false }).limit(10),
      supabase.from("user_activity").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("user_passkeys").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    setSessions(s.data || []);
    setActivity(a.data || []);
    setPasskeys(p.data || []);
  };
  useEffect(() => { loadSessions(); }, [user?.id]);

  const enrollPasskey = async () => {
    if (!supportsBiometric()) { toast.error("Your browser doesn't support passkeys"); return; }
    setEnrolling(true);
    try {
      await registerPasskey(navigator.userAgent.match(/(\w+)\//)?.[1] || "Device");
      toast.success("Passkey enrolled — you can now sign in with biometrics!");
      loadSessions();
    } catch (e: any) { toast.error(e.message || "Failed to enroll"); }
    finally { setEnrolling(false); }
  };

  const removePasskey = async (id: string) => {
    await supabase.from("user_passkeys").delete().eq("id", id);
    toast.success("Passkey removed"); loadSessions();
  };

  const revokeSession = async (id: string) => {
    await supabase.from("user_sessions").delete().eq("id", id);
    toast.success("Session revoked"); loadSessions();
  };

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
    if (file.size > 2 * 1024 * 1024) { toast.error("File too large. Max 2MB."); return; }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) { toast.error("Upload failed: " + uploadError.message); setUploading(false); return; }
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
    navigator.clipboard.writeText(`${window.location.origin}?ref=${profile.referral_code}`);
    setReferralCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setReferralCopied(false), 2000);
  };

  const connectGitHub = () => {
    if (!githubToken.trim()) { toast.error("Enter your GitHub token"); return; }
    localStorage.setItem("github_token", githubToken);
    setGithubConnected(true);
    toast.success("GitHub connected!");
  };

  const disconnectGitHub = () => {
    localStorage.removeItem("github_token");
    setGithubToken("");
    setGithubConnected(false);
    toast.success("GitHub disconnected");
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5">
      <p className="text-sm text-muted-foreground">Settings</p>

      {/* Theme */}
      <div className="glass rounded-xl p-4 space-y-3 liquid-chrome">
        <p className="text-xs font-medium text-foreground">Theme</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {themes.map(({ id, label, icon: Icon }) => (
            <motion.button key={id} onClick={() => setTheme(id)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${theme === id ? "bg-primary/10 text-primary border border-primary/30 glow-yellow" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
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
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="w-16 h-16 rounded-full bg-secondary overflow-hidden border-2 border-primary/20 hover-glow transition-all">
              {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground"><User size={24} /></div>
              )}
            </div>
            <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-110 transition-transform">
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
        <div className="flex gap-2">
          <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Display name" className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
          <button onClick={updateProfile} className="bg-primary text-primary-foreground px-3 py-2 rounded-lg text-xs font-medium btn-hover">Save</button>
        </div>
      </div>

      {/* GitHub Integration */}
      <div className="glass rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <GitBranch size={14} className="text-foreground" />
          <p className="text-xs font-medium text-foreground">GitHub Integration</p>
        </div>
        {githubConnected ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-accent">
              <span className="w-2 h-2 rounded-full bg-accent" />
              Connected
            </div>
            <p className="text-xs text-muted-foreground">You can push projects to GitHub from the Projects page.</p>
            <button onClick={disconnectGitHub} className="text-xs text-destructive hover:underline">Disconnect</button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Enter a GitHub Personal Access Token to push projects to your repositories.
              <a href="https://github.com/settings/tokens/new?scopes=repo" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1 inline-flex items-center gap-0.5">
                Create token <ExternalLink size={10} />
              </a>
            </p>
            <div className="flex gap-2">
              <input value={githubToken} onChange={e => setGithubToken(e.target.value)} placeholder="ghp_xxxxxxxxxxxx" type="password"
                className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
              <button onClick={connectGitHub} className="bg-primary text-primary-foreground px-3 py-2 rounded-lg text-xs font-medium btn-hover">Connect</button>
            </div>
          </div>
        )}
      </div>

      {/* Referral — always visible */}
      <div className="glass rounded-xl p-4 space-y-3 liquid-chrome-intense border-glow">
        <div className="flex items-center gap-2">
          <Share2 size={14} className="text-primary" />
          <p className="text-xs font-medium text-foreground">🎁 Your Referral Link</p>
        </div>
        <p className="text-xs text-muted-foreground">Share your link — <span className="text-primary font-medium">you get 300 tokens</span>, your friend gets <span className="text-accent font-medium">200 tokens</span>!</p>
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
      <div className="glass rounded-xl p-4 space-y-3 liquid-chrome">
        <p className="text-xs font-medium text-foreground">Upgrade to Pro</p>
        <p className="text-xs text-muted-foreground">Get 5,000 tokens/month and premium features.</p>
        <a href="https://support.stinger.co.zw?topic=Pro%20Upgrade" target="_blank" rel="noopener noreferrer" className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-medium hover:opacity-90 btn-hover">
          Request Upgrade →
        </a>
      </div>

      {/* Biometric / Passkeys */}
      <div className="glass rounded-xl p-4 space-y-3 liquid-chrome">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Fingerprint size={14} className="text-primary" />
            <p className="text-xs font-medium text-foreground">Biometric sign-in (Passkeys)</p></div>
          <button onClick={enrollPasskey} disabled={enrolling}
            className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-medium btn-hover disabled:opacity-50">
            {enrolling ? "Enrolling…" : "+ Add passkey"}
          </button>
        </div>
        {passkeys.length === 0 ? (
          <p className="text-xs text-muted-foreground">No passkeys yet. Add one to sign in with Face ID, Touch ID or Windows Hello.</p>
        ) : (
          <div className="space-y-1.5">
            {passkeys.map(pk => (
              <div key={pk.id} className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2">
                <div className="text-xs">
                  <p className="text-foreground font-medium">{pk.device_name}</p>
                  <p className="text-muted-foreground">Added {new Date(pk.created_at).toLocaleDateString()}</p>
                </div>
                <button onClick={() => removePasskey(pk.id)} className="p-1.5 rounded text-destructive hover:bg-destructive/10"><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active sessions */}
      <div className="glass rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2"><Smartphone size={14} className="text-primary" />
          <p className="text-xs font-medium text-foreground">Active sessions & devices</p></div>
        {sessions.length === 0 ? <p className="text-xs text-muted-foreground">No sessions recorded yet.</p> : (
          <div className="space-y-1.5">
            {sessions.map(s => (
              <div key={s.id} className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2">
                <div className="text-xs space-y-0.5">
                  <p className="text-foreground font-medium">{s.browser || "?"} on {s.os || "?"} · {s.device || "?"}</p>
                  <p className="text-muted-foreground flex items-center gap-1"><MapPin size={10} />
                    {[s.city, s.country].filter(Boolean).join(", ") || s.ip_address || "Unknown location"}
                  </p>
                  <p className="text-muted-foreground">Last seen {new Date(s.last_seen_at).toLocaleString()}</p>
                </div>
                <button onClick={() => revokeSession(s.id)} className="p-1.5 rounded text-destructive hover:bg-destructive/10"><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent activity */}
      <div className="glass rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2"><Activity size={14} className="text-primary" />
          <p className="text-xs font-medium text-foreground">Recent activity</p></div>
        {activity.length === 0 ? <p className="text-xs text-muted-foreground">No activity yet.</p> : (
          <div className="max-h-48 overflow-y-auto space-y-1">
            {activity.map(a => (
              <div key={a.id} className="flex items-center justify-between text-xs py-1 border-b border-border/30">
                <span className="text-foreground">{a.action}{a.path ? ` · ${a.path}` : ""}</span>
                <span className="text-muted-foreground">{new Date(a.created_at).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={signOut} className="flex items-center gap-2 text-sm text-destructive hover:underline hover:translate-x-1 transition-transform">
        <LogOut size={14} /> Sign out
      </button>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-xl p-4 space-y-2">
        <p className="text-xs font-medium text-foreground">Contact & Credits</p>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>🔥 Built by <span className="text-foreground font-medium">Vincent Ganiza</span> — Traxxion Tech</p>
          <p>📞 +263 716 857 999 / +263 780 078 177</p>
          <p>🛟 <a href="https://support.stinger.co.zw" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">support.stinger.co.zw</a></p>
          <a href="https://www.facebook.com/profile.php?id=61573017854384" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-block mt-1">Facebook →</a>
        </div>
      </motion.div>
    </div>
  );
};

export default SettingsPage;
