import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Zap, TrendingUp, ArrowUpRight, ShoppingCart, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import StatCard from "@/components/StatCard";

const Tokens = () => {
  const { user, tokenBalance, profile } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    loadTransactions();
    loadPricing();
  }, [user]);

  const loadTransactions = async () => {
    const { data } = await supabase
      .from("token_transactions")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setTransactions(data);
  };

  const loadPricing = async () => {
    const { data } = await supabase
      .from("token_pricing")
      .select("*")
      .eq("active", true)
      .order("price");
    if (data) setPricing(data);
  };

  const handlePurchase = (tier: string) => {
    window.location.href = `mailto:traxxiontech@gmail.com?subject=Token Purchase: ${tier}&body=Hi, I'd like to purchase the ${tier} token package. My email is ${user?.email}`;
  };

  const totalUsed = transactions.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <p className="text-sm text-muted-foreground">Tokens & Credits</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Zap} label="Balance" value={tokenBalance.toLocaleString()} change="Active" index={0} />
        <StatCard icon={TrendingUp} label="Used Total" value={totalUsed.toLocaleString()} change={`${transactions.length} transactions`} index={1} />
        <StatCard icon={ArrowUpRight} label="Plan" value={profile?.plan === "pro" ? "Pro" : "Free"} index={2} />
      </div>

      {/* Buy Tokens */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingCart size={14} className="text-primary" />
          <p className="text-sm font-medium text-foreground">Buy Tokens</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {pricing.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-xl p-4 text-center hover:glow-yellow transition-shadow"
            >
              <p className="text-sm font-medium text-foreground">{p.tier}</p>
              <p className="text-2xl font-bold text-primary mt-2">{p.tokens.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">tokens</p>
              <p className="text-lg font-semibold text-foreground mt-2">${p.price}</p>
              <button
                onClick={() => handlePurchase(p.tier)}
                className="mt-3 w-full bg-primary text-primary-foreground rounded-lg py-2 text-xs font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-1"
              >
                <CreditCard size={12} /> Purchase
              </button>
            </motion.div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Contact traxxiontech@gmail.com to complete your purchase. Tokens will be credited within 24 hours.
        </p>
      </div>

      {/* Upgrade to Pro */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-muted-foreground">Upgrade to Pro</p>
          <a
            href="mailto:traxxiontech@gmail.com?subject=Stinger Dev Pro Upgrade"
            className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Contact to upgrade
          </a>
        </div>
        <p className="text-xs text-muted-foreground">
          Pro: 5,000 tokens/month, priority AI, advanced features. Contact traxxiontech@gmail.com.
        </p>
      </div>

      {/* Transaction History */}
      <div className="glass rounded-xl p-5">
        <p className="text-sm text-muted-foreground mb-4">Transaction History</p>
        <div className="space-y-2">
          {transactions.length === 0 ? (
            <p className="text-xs text-muted-foreground">No transactions yet</p>
          ) : (
            transactions.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center justify-between text-sm"
              >
                <div>
                  <span className="text-foreground">{t.action}</span>
                  {t.description && (
                    <span className="text-xs text-muted-foreground ml-2">— {t.description}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className={t.amount > 0 ? "text-accent" : "text-muted-foreground"}>
                    {t.amount > 0 ? "+" : ""}{t.amount}
                  </span>
                  <span className="text-xs text-muted-foreground w-20 text-right">
                    {new Date(t.created_at).toLocaleDateString()}
                  </span>
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
