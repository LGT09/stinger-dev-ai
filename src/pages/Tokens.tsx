import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, TrendingUp, ArrowUpRight, ShoppingCart, CreditCard, Share2, Copy, Smartphone, Building2, Bitcoin, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import StatCard from "@/components/StatCard";

const Tokens = () => {
  const { user, tokenBalance, profile } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any[]>([]);
  const [referralCopied, setReferralCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadTransactions();
    loadPricing();
  }, [user]);

  const loadTransactions = async () => {
    const { data } = await supabase.from("token_transactions").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(20);
    if (data) setTransactions(data);
  };

  const loadPricing = async () => {
    const { data } = await supabase.from("token_pricing").select("*").eq("active", true).order("price");
    if (data) setPricing(data);
  };

  const [checkout, setCheckout] = useState<any | null>(null);

  const PAYMENT_METHODS = [
    { id: "card", icon: CreditCard, name: "Card", detail: "Visa, Mastercard, Amex — instant activation." },
    { id: "mobile", icon: Smartphone, name: "Mobile money", detail: "EcoCash, OneMoney, InnBucks — under 2 minutes." },
    { id: "bank", icon: Building2, name: "Bank / invoice", detail: "Invoiced by Traxxion Tech, activated within 24h." },
    { id: "crypto", icon: Bitcoin, name: "Crypto", detail: "USDT (TRC-20) or Bitcoin." },
  ];

  const startCheckout = (method: string) => {
    if (!checkout) return;
    const url = `https://support.stinger.co.zw?topic=${encodeURIComponent(`Token Purchase: ${checkout.tier} ($${checkout.price})`)}&method=${method}&email=${encodeURIComponent(user?.email || "")}`;
    window.open(url, "_blank");
    setCheckout(null);
  };

  const copyReferral = () => {
    if (!profile?.referral_code) return;
    navigator.clipboard.writeText(`${window.location.origin}?ref=${profile.referral_code}`);
    setReferralCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setReferralCopied(false), 2000);
  };

  const totalUsed = transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <p className="text-sm text-muted-foreground">Tokens & Credits</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Zap} label="Balance" value={tokenBalance.toLocaleString()} change="Active" index={0} />
        <StatCard icon={TrendingUp} label="Used Total" value={totalUsed.toLocaleString()} change={`${transactions.length} transactions`} index={1} />
        <StatCard icon={ArrowUpRight} label="Plan" value={profile?.plan === "pro" ? "Pro" : "Free"} index={2} />
      </div>

      {/* Referral - Get More Tokens */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-5 liquid-chrome-intense border-glow">
        <div className="flex items-center gap-2 mb-3">
          <Share2 size={14} className="text-primary" />
          <p className="text-sm font-medium text-foreground">🎁 Earn Free Tokens</p>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Share your referral link — <span className="text-primary font-medium">you get $3 tokens</span>, your friend gets <span className="text-accent font-medium">$2 tokens</span> on signup!
        </p>
        {profile?.referral_code && (
          <div className="flex gap-2 items-center">
            <code className="flex-1 bg-secondary rounded-lg px-3 py-2 text-xs text-foreground font-mono truncate">{`${window.location.origin}?ref=${profile.referral_code}`}</code>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={copyReferral} className="bg-primary text-primary-foreground px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1 btn-hover">
              <Copy size={12} /> {referralCopied ? "Copied!" : "Copy Link"}
            </motion.button>
          </div>
        )}
      </motion.div>

      {/* Buy Tokens */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingCart size={14} className="text-primary" />
          <p className="text-sm font-medium text-foreground">Buy Tokens</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {pricing.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} whileHover={{ y: -4 }}
              className="glass rounded-xl p-4 text-center hover:glow-yellow transition-all hover-lift">
              <p className="text-sm font-medium text-foreground">{p.tier}</p>
              <p className="text-2xl font-bold text-gradient mt-2">{p.tokens.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">tokens</p>
              <p className="text-lg font-semibold text-foreground mt-2">${p.price}</p>
              <motion.button whileHover={{ scale: 1.05 }} onClick={() => setCheckout(p)}
                className="mt-3 w-full bg-primary text-primary-foreground rounded-lg py-2 text-xs font-medium hover:opacity-90 flex items-center justify-center gap-1 btn-hover">
                <CreditCard size={12} /> Purchase
              </motion.button>
            </motion.div>
          ))}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          {PAYMENT_METHODS.map(({ id, icon: Icon, name }) => (
            <div key={id} className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2">
              <Icon size={12} className="text-primary" />
              <span className="text-[11px] text-muted-foreground">{name}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">All payments are billed by Traxxion Tech. See <a href="/support/payments" className="text-primary hover:underline">payment methods</a> for full details.</p>
      </div>

      <AnimatePresence>
        {checkout && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
            onClick={() => setCheckout(null)}>
            <motion.div initial={{ y: 30, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="glass liquid-chrome rounded-2xl p-5 w-full max-w-md space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{checkout.tier} — ${checkout.price}</p>
                  <p className="text-xs text-muted-foreground">{checkout.tokens.toLocaleString()} tokens · choose a payment method</p>
                </div>
                <button onClick={() => setCheckout(null)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"><X size={14} /></button>
              </div>
              <div className="space-y-2">
                {PAYMENT_METHODS.map(({ id, icon: Icon, name, detail }) => (
                  <button key={id} onClick={() => startCheckout(id)}
                    className="w-full flex items-start gap-3 text-left rounded-xl bg-secondary/50 hover:bg-secondary p-3 transition-all hover-lift">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon size={14} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">{name}</p>
                      <p className="text-[11px] text-muted-foreground">{detail}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Upgrade tiers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="glass rounded-xl p-5 liquid-chrome">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Upgrade to Pro</p>
            <a href="https://support.stinger.co.zw?topic=Pro%20Upgrade" target="_blank" rel="noopener noreferrer" className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg font-medium hover:opacity-90 btn-hover">
              Upgrade
            </a>
          </div>
          <p className="text-xs text-muted-foreground">Pro: 5,000 tokens/month, priority AI, advanced features.</p>
        </div>
        <div className="glass rounded-xl p-5 liquid-chrome border border-accent/30">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-foreground font-medium">Business — $50/mo</p>
            <a href="https://support.stinger.co.zw?topic=Business%20Upgrade" target="_blank" rel="noopener noreferrer" className="text-xs bg-accent text-accent-foreground px-3 py-1.5 rounded-lg font-medium hover:opacity-90 btn-hover">
              Go Business
            </a>
          </div>
          <p className="text-xs text-muted-foreground">Unlimited tokens, team seats, white-label exports, dedicated support.</p>
        </div>
      </div>

      {/* Transactions */}
      <div className="glass rounded-xl p-5">
        <p className="text-sm text-muted-foreground mb-4">Transaction History</p>
        <div className="space-y-2">
          {transactions.length === 0 ? <p className="text-xs text-muted-foreground">No transactions yet</p> : (
            transactions.map((t, i) => (
              <motion.div key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="flex items-center justify-between text-sm hover:bg-secondary/30 rounded-lg px-2 py-1 transition-all">
                <div>
                  <span className="text-foreground">{t.action}</span>
                  {t.description && <span className="text-xs text-muted-foreground ml-2">— {t.description}</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className={t.amount > 0 ? "text-accent" : "text-muted-foreground"}>{t.amount > 0 ? "+" : ""}{t.amount}</span>
                  <span className="text-xs text-muted-foreground w-20 text-right">{new Date(t.created_at).toLocaleDateString()}</span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Tokens;
