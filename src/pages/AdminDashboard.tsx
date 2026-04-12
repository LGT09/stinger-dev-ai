import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Users, Zap, DollarSign, Search, Plus, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface UserRow {
  user_id: string;
  display_name: string | null;
  email: string | null;
  is_verified: boolean;
  plan: "free" | "pro";
  balance?: number;
}

const AdminDashboard = () => {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [tokenAmount, setTokenAmount] = useState<Record<string, number>>({});
  const [pricing, setPricing] = useState<any[]>([]);
  const [editPricing, setEditPricing] = useState<Record<string, { tier: string; tokens: number; price: number }>>({});

  useEffect(() => {
    if (!isAdmin) return;
    loadUsers();
    loadPricing();
  }, [isAdmin]);

  const loadUsers = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*");
    if (!profiles) return;
    const { data: balances } = await supabase.from("token_balances").select("*");
    const merged = profiles.map((p) => ({
      ...p,
      balance: balances?.find((b) => b.user_id === p.user_id)?.balance ?? 0,
    }));
    setUsers(merged);
  };

  const loadPricing = async () => {
    const { data } = await supabase.from("token_pricing").select("*").order("price");
    if (data) setPricing(data);
  };

  const grantTokens = async (userId: string, amount: number) => {
    const user = users.find((u) => u.user_id === userId);
    if (!user) return;
    const newBalance = (user.balance ?? 0) + amount;
    const { error } = await supabase
      .from("token_balances")
      .update({ balance: newBalance })
      .eq("user_id", userId);
    if (error) {
      toast.error("Failed to update tokens");
      return;
    }
    await supabase.from("token_transactions").insert({
      user_id: userId,
      amount,
      action: amount > 0 ? "Admin grant" : "Admin deduction",
      description: `Admin adjusted by ${amount} tokens`,
    });
    toast.success(`${amount > 0 ? "Granted" : "Deducted"} ${Math.abs(amount)} tokens`);
    loadUsers();
  };

  const togglePlan = async (userId: string, plan: "free" | "pro") => {
    const newPlan = plan === "free" ? "pro" : "free";
    await supabase.from("profiles").update({ plan: newPlan }).eq("user_id", userId);
    toast.success(`Plan updated to ${newPlan}`);
    loadUsers();
  };

  const toggleVerified = async (userId: string, current: boolean) => {
    await supabase.from("profiles").update({ is_verified: !current }).eq("user_id", userId);
    toast.success(`Verification ${!current ? "granted" : "revoked"}`);
    loadUsers();
  };

  const updatePricing = async (id: string) => {
    const edit = editPricing[id];
    if (!edit) return;
    const { error } = await supabase.from("token_pricing").update(edit).eq("id", id);
    if (error) toast.error("Failed to update pricing");
    else {
      toast.success("Pricing updated");
      loadPricing();
      setEditPricing((p) => { const n = { ...p }; delete n[id]; return n; });
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="glass rounded-xl p-8 text-center">
          <Shield size={32} className="text-destructive mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">Access Denied</p>
          <p className="text-xs text-muted-foreground mt-1">Admin privileges required</p>
        </div>
      </div>
    );
  }

  const filtered = users.filter(
    (u) =>
      (u.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (u.display_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Shield size={16} className="text-primary" />
        <p className="text-sm text-muted-foreground">Admin Dashboard</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users size={14} className="text-primary" />
            <span className="text-xs text-muted-foreground">Total Users</span>
          </div>
          <p className="text-xl font-semibold text-foreground">{users.length}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={14} className="text-primary" />
            <span className="text-xs text-muted-foreground">Total Tokens in System</span>
          </div>
          <p className="text-xl font-semibold text-foreground">
            {users.reduce((s, u) => s + (u.balance ?? 0), 0).toLocaleString()}
          </p>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={14} className="text-primary" />
            <span className="text-xs text-muted-foreground">Pro Users</span>
          </div>
          <p className="text-xl font-semibold text-foreground">
            {users.filter((u) => u.plan === "pro").length}
          </p>
        </div>
      </div>

      {/* Token Pricing Management */}
      <div className="glass rounded-xl p-5">
        <p className="text-sm font-medium text-foreground mb-3">Token Pricing</p>
        <div className="space-y-2">
          {pricing.map((p) => (
            <div key={p.id} className="flex items-center gap-3 text-sm">
              {editPricing[p.id] ? (
                <>
                  <input value={editPricing[p.id].tier} onChange={(e) => setEditPricing((prev) => ({ ...prev, [p.id]: { ...prev[p.id], tier: e.target.value } }))} className="bg-secondary rounded px-2 py-1 text-xs w-24" />
                  <input type="number" value={editPricing[p.id].tokens} onChange={(e) => setEditPricing((prev) => ({ ...prev, [p.id]: { ...prev[p.id], tokens: +e.target.value } }))} className="bg-secondary rounded px-2 py-1 text-xs w-20" />
                  <input type="number" step="0.01" value={editPricing[p.id].price} onChange={(e) => setEditPricing((prev) => ({ ...prev, [p.id]: { ...prev[p.id], price: +e.target.value } }))} className="bg-secondary rounded px-2 py-1 text-xs w-20" />
                  <button onClick={() => updatePricing(p.id)} className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">Save</button>
                  <button onClick={() => setEditPricing((prev) => { const n = { ...prev }; delete n[p.id]; return n; })} className="text-xs text-muted-foreground">Cancel</button>
                </>
              ) : (
                <>
                  <span className="text-foreground w-24">{p.tier}</span>
                  <span className="text-muted-foreground w-20">{p.tokens} tokens</span>
                  <span className="text-primary">${p.price}</span>
                  <button onClick={() => setEditPricing((prev) => ({ ...prev, [p.id]: { tier: p.tier, tokens: p.tokens, price: p.price } }))} className="text-xs text-muted-foreground hover:text-foreground ml-auto">Edit</button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* User Management */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Search size={14} className="text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>

        <div className="space-y-3">
          {filtered.map((u) => (
            <motion.div
              key={u.user_id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-secondary/50 text-sm"
            >
              <div className="flex-1 min-w-[150px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-foreground font-medium">{u.display_name || "—"}</span>
                  {u.is_verified && <span className="text-blue-400 text-xs">✔</span>}
                </div>
                <span className="text-xs text-muted-foreground">{u.email}</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${u.plan === "pro" ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>
                {u.plan}
              </span>
              <span className="text-xs text-muted-foreground">
                <Zap size={10} className="inline" /> {u.balance ?? 0}
              </span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  placeholder="±"
                  value={tokenAmount[u.user_id] ?? ""}
                  onChange={(e) => setTokenAmount((p) => ({ ...p, [u.user_id]: +e.target.value }))}
                  className="w-16 bg-secondary rounded px-2 py-1 text-xs"
                />
                <button onClick={() => grantTokens(u.user_id, tokenAmount[u.user_id] || 0)} className="p-1 rounded bg-accent/20 text-accent hover:bg-accent/30">
                  <Plus size={12} />
                </button>
                <button onClick={() => grantTokens(u.user_id, -(tokenAmount[u.user_id] || 0))} className="p-1 rounded bg-destructive/20 text-destructive hover:bg-destructive/30">
                  <Minus size={12} />
                </button>
              </div>
              <button onClick={() => togglePlan(u.user_id, u.plan)} className="text-xs text-primary hover:underline">
                {u.plan === "free" ? "→ Pro" : "→ Free"}
              </button>
              <button onClick={() => toggleVerified(u.user_id, u.is_verified)} className="text-xs text-blue-400 hover:underline">
                {u.is_verified ? "Unverify" : "Verify"}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
