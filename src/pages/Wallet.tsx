import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Wallet as WalletIcon, Zap, TrendingDown, TrendingUp, Gift, Sparkles, RefreshCw, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Tx {
  id: string;
  amount: number;
  action: string;
  description: string | null;
  created_at: string;
}

const Wallet = () => {
  const { user, tokenBalance, refreshTokens } = useAuth();
  const [tx, setTx] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("token_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    setTx((data as any) || []);
    await refreshTokens();
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const last30 = tx.filter(t => Date.now() - new Date(t.created_at).getTime() < 30 * 86400_000);
  const spent = Math.abs(last30.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0));
  const earned = last30.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);

  // Group last 14 days for tiny bar chart
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i));
    const key = d.toISOString().slice(0, 10);
    const v = tx.filter(t => t.created_at.startsWith(key) && t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    return { key, label: d.toLocaleDateString(undefined, { weekday: "short" })[0], v };
  });
  const maxV = Math.max(1, ...days.map(d => d.v));

  const typeColor = (a: number, action: string) => {
    if (a > 0 && /grant|refill|referral|bonus/i.test(action)) return "text-green-400 bg-green-400/10";
    if (a > 0) return "text-accent bg-accent/10";
    return "text-destructive bg-destructive/10";
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <WalletIcon size={16} className="text-primary" />
          <p className="text-sm text-muted-foreground">Wallet</p>
        </div>
        <button onClick={load} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Balance hero */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6 liquid-chrome relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Zap size={11} /> Balance</div>
        <p className="text-4xl font-semibold text-foreground mt-1">{tokenBalance.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground mt-1">Tokens available across all devices</p>
        <div className="mt-4 flex gap-2">
          <button onClick={() => navigate("/tokens")}
            className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-medium btn-hover">
            <Sparkles size={11} /> Recharge <ArrowRight size={11} />
          </button>
          <button onClick={() => navigate("/settings")}
            className="flex items-center gap-1 bg-secondary text-foreground px-3 py-1.5 rounded-lg text-xs font-medium">
            <Gift size={11} /> Invite for bonus
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><TrendingDown size={11} className="text-destructive" /> Spent · 30d</div>
          <p className="text-lg font-semibold text-foreground mt-1">{spent.toLocaleString()}</p>
        </div>
        <div className="glass rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><TrendingUp size={11} className="text-green-400" /> Earned · 30d</div>
          <p className="text-lg font-semibold text-foreground mt-1">{earned.toLocaleString()}</p>
        </div>
      </div>

      {/* Tiny usage chart */}
      <div className="glass rounded-xl p-4">
        <p className="text-xs font-medium text-foreground mb-3">Last 14 days · tokens spent</p>
        <div className="flex items-end gap-1 h-24">
          {days.map(d => (
            <div key={d.key} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-primary/60 rounded-t" style={{ height: `${(d.v / maxV) * 100}%`, minHeight: 2 }} title={`${d.v} tokens`} />
              <span className="text-[9px] text-muted-foreground">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* History */}
      <div className="glass rounded-xl p-4">
        <p className="text-xs font-medium text-foreground mb-3">Transaction history</p>
        {tx.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">No transactions yet.</p>
        ) : (
          <div className="space-y-1.5">
            {tx.map(t => (
              <div key={t.id} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg hover:bg-secondary/40">
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${typeColor(t.amount, t.action)}`}>
                  {t.amount > 0 ? "+" : ""}{t.amount}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground truncate">{t.action}</p>
                  {t.description && <p className="text-[10px] text-muted-foreground truncate">{t.description}</p>}
                </div>
                <span className="text-[10px] text-muted-foreground flex-shrink-0">
                  {new Date(t.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Wallet;