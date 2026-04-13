import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed");
    }
    if (result.redirected) return;
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset email sent! Check your inbox.");
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName, referral_code: referralCode || undefined },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("Account created! Check your email to verify.");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" data-theme="neon">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <img src={logo} alt="Stinger Dev" className="w-16 h-16 mb-3" />
          <p className="text-lg font-semibold text-foreground">Stinger Dev</p>
          <p className="text-xs text-muted-foreground mt-1">AI-Powered Software Platform</p>
        </div>

        <div className="glass rounded-xl p-6">
          {isForgot ? (
            <>
              <p className="text-sm font-medium text-foreground mb-4">Reset Password</p>
              <form onSubmit={handleForgotPassword} className="space-y-3">
                <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50">
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
              </form>
              <button onClick={() => setIsForgot(false)} className="text-xs text-primary hover:underline mt-3 block">← Back to login</button>
            </>
          ) : (
            <>
              <div className="flex gap-1 mb-5 bg-secondary rounded-lg p-1">
                <button onClick={() => setIsLogin(true)} className={`flex-1 text-xs py-2 rounded-md font-medium transition-all ${isLogin ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Sign In</button>
                <button onClick={() => setIsLogin(false)} className={`flex-1 text-xs py-2 rounded-md font-medium transition-all ${!isLogin ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Sign Up</button>
              </div>

              {/* Google Sign In */}
              <button onClick={handleGoogleSignIn} disabled={loading} className="w-full flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-lg py-2.5 text-sm font-medium transition-colors mb-4">
                <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-border"></div>
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 h-px bg-border"></div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                {!isLogin && (
                  <>
                    <input type="text" placeholder="Display Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                    <input type="text" placeholder="Referral Code (optional)" value={referralCode} onChange={(e) => setReferralCode(e.target.value)} className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  </>
                )}
                <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50">
                  {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
                </button>
              </form>
              {isLogin && (
                <button onClick={() => setIsForgot(true)} className="text-xs text-primary hover:underline mt-3 block">Forgot password?</button>
              )}
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">© 2026 Stinger Dev — Traxxion Tech</p>
      </motion.div>
    </div>
  );
};

export default AuthPage;
