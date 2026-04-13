import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Users, Zap, DollarSign, Search, Plus, Minus, Ban, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface UserRow {
  user_id: string;
  display_name: string | null;
  email: string | null;
  is_verified: boolean;
  is_banned: boolean;
  is_suspended: boolean;
  ban_reason: string | null;
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
  const [banReason, setBanReason] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isAdmin) return;
    loadUsers();
    loadPricing();
  }, [isAdmin]);

  const loadUsers = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*");
    if (!profiles) return;
    const { data: balances } = await supabase.from("token_balances").select("*");
    const merged = profiles.map((p: any) => ({
      ...p,
      balance: balances?.find((b: any) => b.user_id === p.user_id)?.balance ?? 0,
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
    await supabase.from("token_balances").update({ balance: newBalance }).eq("user_id", userId);
    await supabase.from("token_transactions").insert({ user_id: userId, amount, action: amount > 0 ? "Admin grant" : "Admin deduction", description: `Admin adjusted by ${amount} tokens` });
    toast.success(`${amount > 0 ? "Granted" : "Deducted"} ${Math.abs(amount)} tokens`);
    loadUsers();
  };

  const togglePlan = async (userId: string, plan: "free" | "pro") => {
    await supabase.from("profiles").update({ plan: plan === "free" ? "pro" : "free" }).eq("user_id", userId);
    toast.success("Plan updated");
    loadUsers();
  };

  const toggleVerified = async (userId: string, current: boolean) => {
    await supabase.from("profiles").update({ is_verified: !current }).eq("user_id", userId);
    toast.success(`Verification ${!current ? "granted" : "revoked"}`);
    loadUsers();
  };

  const banUser = async (userId: string) => {
    const reason = banReason[userId] || "Violation of terms";
    await supabase.from("profiles").update({ is_banned: true, ban_reason: reason }).eq("user_id", userId);
    toast.success("User banned");
    loadUsers();
  };

  const suspendUser = async (userId: string) => {
    await supabase.from("profiles").update({ is_suspended: true, ban_reason: banReason[userId] || "Temporary suspension" }).eq("user_id", userId);
    toast.success("User suspended");
    loadUsers();
  };

  const unbanUser = async (userId: string) => {
    await supabase.from("profiles").update({ is_banned: false, is_suspended: false, ban_reason: null }).eq("user_id", userId);
    toast.success("User unbanned");
    loadUsers();
  };

  const updatePricing = async (id: string) => {
    const edit = editPricing[id];
    if (!edit) return;
    await supabase.from("token_pricing").update(edit).eq("id", id);
    toast.success("Pricing updated");
    loadPricing();
    setEditPricing((p) => { const n = { ...p }; delete n[id]; return n; });
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

  const filtered = users.filter((u) => (u.email ?? "").toLowerCase().includes(search.toLowerCase()) || (u.display_name ?? "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center gap-2">
        <Shield size={16} className="text-primary" />
        <p className="text-sm text-muted-foreground">Admin Dashboard</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Users, label: "Users", value: users.length },
          { icon: Zap, label: "Total Tokens", value: users.reduce((s, u) => s + (u.balance ?? 0), 0).toLocaleString() },
          { icon: DollarSign, label: "Pro Users", value: users.filter((u) => u.plan === "pro").length },
          { icon: Ban, label: "Banned", value: users.filter((u) => u.is_banned || u.is_suspended).length },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="glass rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1"><Icon size={12} className="text-primary" /><span className="text-[10px] text-muted-foreground">{label}</span></div>
            <p className="text-lg font-semibold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* Token Pricing */}
      <div className="glass rounded-xl p-4">
        <p className="text-xs font-medium text-foreground mb-3">Token Pricing</p>
        <div className="space-y-2">
          {pricing.map((p) => (
            <div key={p.id} className="flex items-center gap-2 text-xs flex-wrap">
              {editPricing[p.id] ? (
                <>
                  <input value={editPricing[p.id].tier} onChange={(e) => setEditPricing((prev) => ({ ...prev, [p.id]: { ...prev[p.id], tier: e.target.value } }))} className="bg-secondary rounded px-2 py-1 w-20" />
                  <input type="number" value={editPricing[p.id].tokens} onChange={(e) => setEditPricing((prev) => ({ ...prev, [p.id]: { ...prev[p.id], tokens: +e.target.value } }))} className="bg-secondary rounded px-2 py-1 w-16" />
                  <input type="number" step="0.01" value={editPricing[p.id].price} onChange={(e) => setEditPricing((prev) => ({ ...prev, [p.id]: { ...prev[p.id], price: +e.target.value } }))} className="bg-secondary rounded px-2 py-1 w-16" />
                  <button onClick={() => updatePricing(p.id)} className="bg-primary text-primary-foreground px-2 py-1 rounded">Save</button>
                  <button onClick={() => setEditPricing((prev) => { const n = { ...prev }; delete n[p.id]; return n; })} className="text-muted-foreground">Cancel</button>
                </>
              ) : (
                <>
                  <span className="text-foreground w-20">{p.tier}</span>
                  <span className="text-muted-foreground w-16">{p.tokens}t</span>
                  <span className="text-primary">${p.price}</span>
                  <button onClick={() => setEditPricing((prev) => ({ ...prev, [p.id]: { tier: p.tier, tokens: p.tokens, price: p.price } }))} className="text-muted-foreground hover:text-foreground ml-auto">Edit</button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Users */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Search size={14} className="text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" />
        </div>
        <div className="space-y-2">
          {filtered.map((u) => (
            <motion.div key={u.user_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`p-3 rounded-lg text-xs space-y-2 ${u.is_banned ? "bg-destructive/10 border border-destructive/20" : u.is_suspended ? "bg-yellow-500/10 border border-yellow-500/20" : "bg-secondary/50"}`}>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex-1 min-w-[120px]">
                  <div className="flex items-center gap-1">
                    <span className="text-foreground font-medium">{u.display_name || "—"}</span>
                    {u.is_verified && <span className="text-blue-400">✔</span>}
                    {u.is_banned && <span className="text-destructive">🚫</span>}
                    {u.is_suspended && <span className="text-yellow-500">⚠</span>}
                  </div>
                  <span className="text-muted-foreground">{u.email}</span>
                  {u.ban_reason && <p className="text-destructive/80 italic mt-0.5">{u.ban_reason}</p>}
                </div>
                <span className={`px-1.5 py-0.5 rounded-full ${u.plan === "pro" ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>{u.plan}</span>
                <span className="text-muted-foreground"><Zap size={10} className="inline" /> {u.balance ?? 0}</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <input type="number" placeholder="±" value={tokenAmount[u.user_id] ?? ""} onChange={(e) => setTokenAmount((p) => ({ ...p, [u.user_id]: +e.target.value }))} className="w-14 bg-secondary rounded px-1.5 py-1" />
                <button onClick={() => grantTokens(u.user_id, tokenAmount[u.user_id] || 0)} className="p-1 rounded bg-accent/20 text-accent"><Plus size={10} /></button>
                <button onClick={() => grantTokens(u.user_id, -(tokenAmount[u.user_id] || 0))} className="p-1 rounded bg-destructive/20 text-destructive"><Minus size={10} /></button>
                <button onClick={() => togglePlan(u.user_id, u.plan)} className="text-primary hover:underline">{u.plan === "free" ? "→Pro" : "→Free"}</button>
                <button onClick={() => toggleVerified(u.user_id, u.is_verified)} className="text-blue-400 hover:underline">{u.is_verified ? "Unverify" : "Verify"}</button>
                {u.is_banned || u.is_suspended ? (
                  <button onClick={() => unbanUser(u.user_id)} className="text-green-400 hover:underline">Unban</button>
                ) : (
                  <>
                    <input placeholder="Reason..." value={banReason[u.user_id] ?? ""} onChange={(e) => setBanReason((p) => ({ ...p, [u.user_id]: e.target.value }))} className="bg-secondary rounded px-1.5 py-1 w-24" />
                    <button onClick={() => banUser(u.user_id)} className="text-destructive hover:underline">Ban</button>
                    <button onClick={() => suspendUser(u.user_id)} className="text-yellow-500 hover:underline">Suspend</button>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
