import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { startSession, touchSession, logActivity } from "@/lib/tracking";

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  is_banned: boolean;
  is_suspended: boolean;
  ban_reason: string | null;
  referral_code: string | null;
  referred_by: string | null;
  plan: "free" | "pro";
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  tokenBalance: number;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshTokens: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).single();
    if (data) setProfile(data as any);
  };

  const fetchRoles = async (userId: string) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    setIsAdmin(data?.some((r) => r.role === "admin") ?? false);
  };

  const fetchTokens = async (userId: string) => {
    const { data } = await supabase.from("token_balances").select("balance").eq("user_id", userId).single();
    setTokenBalance(data?.balance ?? 0);
  };

  const refreshProfile = async () => { if (user) await fetchProfile(user.id); };
  const refreshTokens = async () => { if (user) await fetchTokens(user.id); };

  // Sessions are capped at 24 hours — after that the user must sign in again.
  const SESSION_MAX_MS = 24 * 60 * 60 * 1000;
  const SESSION_START_KEY = "stinger-session-start";

  /** Returns true when the session was force-expired. */
  const enforceSessionAge = async (uid?: string) => {
    if (!uid) return false;
    const started = Number(localStorage.getItem(SESSION_START_KEY) || 0);
    if (!started) { localStorage.setItem(SESSION_START_KEY, String(Date.now())); return false; }
    if (Date.now() - started > SESSION_MAX_MS) {
      localStorage.removeItem(SESSION_START_KEY);
      await supabase.auth.signOut();
      return true;
    }
    return false;
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);

      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(async () => {
          await Promise.all([fetchProfile(session.user.id), fetchRoles(session.user.id), fetchTokens(session.user.id)]);
          if (_event === "SIGNED_IN") {
            startSession(session.user.id);
            logActivity(session.user.id, "sign_in");
          }
          setLoading(false);
        }, 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setTokenBalance(0);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        Promise.all([fetchProfile(session.user.id), fetchRoles(session.user.id), fetchTokens(session.user.id)]).then(() => {
          touchSession();
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // Touch session every 60s while page is open
    const interval = setInterval(() => { touchSession(); }, 60_000);
    window.addEventListener("focus", touchSession);

    return () => { subscription.unsubscribe(); clearInterval(interval); window.removeEventListener("focus", touchSession); };
  }, []);

  const signOut = async () => { await supabase.auth.signOut(); };

  return (
    <AuthContext.Provider value={{ session, user, profile, isAdmin, tokenBalance, loading, signOut, refreshProfile, refreshTokens }}>
      {children}
    </AuthContext.Provider>
  );
};
