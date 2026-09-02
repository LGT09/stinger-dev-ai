import { useState, useEffect, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { Shield, Users, Zap, DollarSign, Search, Plus, Minus, Ban, AlertTriangle, Check, X, RefreshCw, Globe, Monitor, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
const AdminComms = lazy(() => import("@/components/AdminComms"));
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
  last_seen_at?: string | null;
  last_ip?: string | null;
  last_device?: string | null;
  last_location?: string | null;
  last_browser?: string | null;
}

const AdminDashboard = () => {
  const { isAdmin, user } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [tokenAmount, setTokenAmount] = useState<Record<string, number>>({});
  const [pricing, setPricing] = useState<any[]>([]);
  const [editPricing, setEditPricing] = useState<Record<string, { tier: string; tokens: number; price: number }>>({});
  const [banReason, setBanReason] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(25);

  useEffect(() => {
    if (!isAdmin) return;
    loadUsers();
    loadPricing();
  }, [isAdmin]);

  const loadUsers = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: balances }, { data: sessions }] = await Promise.all([
      supabase
        .from("profiles")
        .select("user_id, display_name, email, is_verified, is_banned, is_suspended, ban_reason, plan")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("token_balances").select("user_id, balance").limit(1000),
      supabase
        .from("user_sessions")
        .select("user_id, ip_address, last_seen_at, device, browser, city, country")
        .order("last_seen_at", { ascending: false })
        .limit(500),
    ]);
    if (!profiles) { setLoading(false); return; }
    const balanceByUser: Record<string, number> = {};
    (balances || []).forEach((b: any) => { balanceByUser[b.user_id] = b.balance; });
    const latestByUser: Record<string, any> = {};
    (sessions || []).forEach((s: any) => { if (!latestByUser[s.user_id]) latestByUser[s.user_id] = s; });
    const merged = profiles.map((p: any) => {
      const s = latestByUser[p.user_id];
      return {
        ...p,
        balance: balanceByUser[p.user_id] ?? 0,
        last_seen_at: s?.last_seen_at ?? null,
        last_ip: s?.ip_address ?? null,
        last_device: s?.device ?? null,
        last_browser: s?.browser ?? null,
        last_location: s ? [s.city, s.country].filter(Boolean).join(", ") : null,
      };
    });
    setUsers(merged);
    setLoading(false);
  };

  const loadPricing = async () => {
    const { data } = await supabase.from("token_pricing").select("*").order("price");
    if (data) setPricing(data);
  };

  const grantTokens = async (userId: string, amount: number) => {
    if (!amount) { toast.error("Enter an amount first"); return; }
    const { error } = await supabase.rpc("admin_grant_tokens", { _amount: amount, _user_ids: [userId], _mode: "add" });
    if (error) { toast.error("Failed: " + error.message); return; }
    toast.success(`${amount > 0 ? "Granted" : "Deducted"} ${Math.abs(amount)} tokens`);
    setTokenAmount(p => ({ ...p, [userId]: 0 }));
    loadUsers();
  };

  /** Bulk grant / deduct / set — everyone, the current search results, or picked users. */
  const runBulk = async () => {
    const amount = Number(bulkAmount);
    if (!amount && bulkMode !== "set") { toast.error("Enter an amount"); return; }
    let ids: string[] | null = null;
    if (bulkTarget === "selected") {
      ids = Object.keys(selected).filter(id => selected[id]);
      if (!ids.length) { toast.error("Select at least one user"); return; }
    } else if (bulkTarget === "filtered") {
      ids = filteredIds();
      if (!ids.length) { toast.error("No users match the search"); return; }
    }
    if (bulkTarget === "all" && !confirm(`Apply "${bulkMode} ${amount}" tokens to EVERY user?`)) return;
    setBulkBusy(true);
    const { data, error } = await supabase.rpc("admin_grant_tokens", { _amount: amount, _user_ids: ids, _mode: bulkMode });
    setBulkBusy(false);
    if (error) { toast.error("Failed: " + error.message); return; }
    toast.success(`Tokens updated for ${data ?? 0} user(s)`);
    setSelected({});
    loadUsers();
  };


  const togglePlan = async (userId: string, plan: "free" | "pro") => {
    const { error } = await supabase.from("profiles").update({ plan: plan === "free" ? "pro" : "free" }).eq("user_id", userId);
    if (error) { toast.error("Failed: " + error.message); return; }
    toast.success("Plan updated");
    loadUsers();
  };

  const toggleVerified = async (userId: string, current: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_verified: !current }).eq("user_id", userId);
    if (error) { toast.error("Failed: " + error.message); return; }
    toast.success(`Verification ${!current ? "granted" : "revoked"}`);
    loadUsers();
  };

  const banUser = async (userId: string) => {
    if (userId === user?.id) { toast.error("Cannot ban yourself"); return; }
    const reason = banReason[userId] || "Violation of terms";
    const { error } = await supabase.from("profiles").update({ is_banned: true, ban_reason: reason }).eq("user_id", userId);
    if (error) { toast.error("Failed: " + error.message); return; }
    toast.success("User banned");
    setBanReason(p => ({ ...p, [userId]: "" }));
    loadUsers();
  };

  const suspendUser = async (userId: string) => {
    if (userId === user?.id) { toast.error("Cannot suspend yourself"); return; }
    const { error } = await supabase.from("profiles").update({ is_suspended: true, ban_reason: banReason[userId] || "Temporary suspension" }).eq("user_id", userId);
    if (error) { toast.error("Failed: " + error.message); return; }
    toast.success("User suspended");
    setBanReason(p => ({ ...p, [userId]: "" }));
    loadUsers();
  };

  const unbanUser = async (userId: string) => {
    const { error } = await supabase.from("profiles").update({ is_banned: false, is_suspended: false, ban_reason: null }).eq("user_id", userId);
    if (error) { toast.error("Failed: " + error.message); return; }
    toast.success("User restored");
    loadUsers();
  };

  const updatePricing = async (id: string) => {
    const edit = editPricing[id];
    if (!edit) return;
    const { error } = await supabase.from("token_pricing").update(edit).eq("id", id);
    if (error) { toast.error("Failed: " + error.message); return; }
    toast.success("Pricing updated");
    loadPricing();
    setEditPricing(p => { const n = { ...p }; delete n[id]; return n; });
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

  const q = search.trim().toLowerCase();
  const filtered = q
    ? users.filter(u =>
        (u.email ?? "").toLowerCase().includes(q) ||
        (u.display_name ?? "").toLowerCase().includes(q)
      )
    : users;
  const visible = filtered.slice(0, limit);


  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-primary" />
          <p className="text-sm text-muted-foreground">Admin Dashboard</p>
        </div>
        <button onClick={loadUsers} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Users, label: "Users", value: users.length, color: "text-accent" },
          { icon: Zap, label: "Total Tokens", value: users.reduce((s, u) => s + (u.balance ?? 0), 0).toLocaleString(), color: "text-primary" },
          { icon: DollarSign, label: "Pro Users", value: users.filter(u => u.plan === "pro").length, color: "text-green-400" },
          { icon: Ban, label: "Banned", value: users.filter(u => u.is_banned || u.is_suspended).length, color: "text-destructive" },
        ].map(({ icon: Icon, label, value, color }) => (
          <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-3 hover:scale-105 transition-transform">
            <div className="flex items-center gap-1.5 mb-1"><Icon size={12} className={color} /><span className="text-[10px] text-muted-foreground">{label}</span></div>
            <p className="text-lg font-semibold text-foreground">{value}</p>
          </motion.div>
        ))}
      </div>

      {/* Communications */}
      <Suspense fallback={<div className="glass rounded-xl p-4 text-xs text-muted-foreground">Loading communications…</div>}>
        <AdminComms />
      </Suspense>

      {/* Token Pricing */}
      <div className="glass rounded-xl p-4">
        <p className="text-xs font-medium text-foreground mb-3">Token Pricing</p>
        <div className="space-y-2">
          {pricing.map(p => (
            <div key={p.id} className="flex items-center gap-2 text-xs flex-wrap">
              {editPricing[p.id] ? (
                <>
                  <input value={editPricing[p.id].tier} onChange={e => setEditPricing(prev => ({ ...prev, [p.id]: { ...prev[p.id], tier: e.target.value } }))} className="bg-secondary rounded px-2 py-1 w-20 text-foreground" />
                  <input type="number" value={editPricing[p.id].tokens} onChange={e => setEditPricing(prev => ({ ...prev, [p.id]: { ...prev[p.id], tokens: +e.target.value } }))} className="bg-secondary rounded px-2 py-1 w-16 text-foreground" />
                  <input type="number" step="0.01" value={editPricing[p.id].price} onChange={e => setEditPricing(prev => ({ ...prev, [p.id]: { ...prev[p.id], price: +e.target.value } }))} className="bg-secondary rounded px-2 py-1 w-16 text-foreground" />
                  <button onClick={() => updatePricing(p.id)} className="p-1 rounded bg-accent/20 text-accent hover:bg-accent/30"><Check size={10} /></button>
                  <button onClick={() => setEditPricing(prev => { const n = { ...prev }; delete n[p.id]; return n; })} className="p-1 rounded text-muted-foreground hover:text-foreground"><X size={10} /></button>
                </>
              ) : (
                <>
                  <span className="text-foreground w-20">{p.tier}</span>
                  <span className="text-muted-foreground w-16">{p.tokens}t</span>
                  <span className="text-primary">${p.price}</span>
                  <button onClick={() => setEditPricing(prev => ({ ...prev, [p.id]: { tier: p.tier, tokens: p.tokens, price: p.price } }))} className="text-muted-foreground hover:text-foreground ml-auto text-[10px]">Edit</button>
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
          <input value={search} onChange={e => { setSearch(e.target.value); setLimit(25); }} placeholder="Search users..." className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" />
        </div>
        <div className="space-y-2">
          {visible.map(u => (
            <div key={u.user_id} className={`p-3 rounded-lg text-xs space-y-2 transition-all ${
              u.is_banned ? "bg-destructive/10 border border-destructive/20" :
              u.is_suspended ? "bg-yellow-500/10 border border-yellow-500/20" :
              "bg-secondary/50 hover:bg-secondary/70"
            }`}>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex-1 min-w-[120px]">
                  <div className="flex items-center gap-1">
                    <span className="text-foreground font-medium">{u.display_name || "—"}</span>
                    {u.is_verified && <span className="text-blue-400">✔</span>}
                    {u.is_banned && <span className="text-destructive text-[10px]">BANNED</span>}
                    {u.is_suspended && !u.is_banned && <span className="text-yellow-500 text-[10px]">SUSPENDED</span>}
                  </div>
                  <span className="text-muted-foreground">{u.email}</span>
                  {u.ban_reason && <p className="text-destructive/80 italic mt-0.5">Reason: {u.ban_reason}</p>}
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[10px] text-muted-foreground">
                    {u.last_seen_at && <span className="flex items-center gap-1"><Clock size={9} /> {new Date(u.last_seen_at).toLocaleString()}</span>}
                    {u.last_ip && <span className="flex items-center gap-1"><Globe size={9} /> {u.last_ip}</span>}
                    {u.last_location && <span>{u.last_location}</span>}
                    {(u.last_device || u.last_browser) && <span className="flex items-center gap-1"><Monitor size={9} /> {[u.last_device, u.last_browser].filter(Boolean).join(" · ")}</span>}
                  </div>
                </div>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${u.plan === "pro" ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>{u.plan}</span>
                <span className="text-muted-foreground"><Zap size={10} className="inline" /> {u.balance ?? 0}</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <input type="number" placeholder="±" value={tokenAmount[u.user_id] ?? ""} onChange={e => setTokenAmount(p => ({ ...p, [u.user_id]: +e.target.value }))} className="w-14 bg-secondary rounded px-1.5 py-1 text-foreground" />
                <button onClick={() => grantTokens(u.user_id, tokenAmount[u.user_id] || 0)} className="p-1 rounded bg-accent/20 text-accent hover:bg-accent/30 transition-colors" title="Grant"><Plus size={10} /></button>
                <button onClick={() => grantTokens(u.user_id, -(tokenAmount[u.user_id] || 0))} className="p-1 rounded bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors" title="Deduct"><Minus size={10} /></button>
                <div className="w-px h-4 bg-border/30 mx-0.5" />
                <button onClick={() => togglePlan(u.user_id, u.plan)} className="text-primary hover:underline">{u.plan === "free" ? "→Pro" : "→Free"}</button>
                <button onClick={() => toggleVerified(u.user_id, u.is_verified)} className="text-blue-400 hover:underline">{u.is_verified ? "Unverify" : "Verify"}</button>
                {u.is_banned || u.is_suspended ? (
                  <button onClick={() => unbanUser(u.user_id)} className="text-green-400 hover:underline font-medium">Restore</button>
                ) : (
                  <>
                    <input placeholder="Reason..." value={banReason[u.user_id] ?? ""} onChange={e => setBanReason(p => ({ ...p, [u.user_id]: e.target.value }))} className="bg-secondary rounded px-1.5 py-1 w-24 text-foreground placeholder:text-muted-foreground" />
                    <button onClick={() => banUser(u.user_id)} className="text-destructive hover:underline font-medium">Ban</button>
                    <button onClick={() => suspendUser(u.user_id)} className="text-yellow-500 hover:underline font-medium">Suspend</button>
                  </>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-xs text-muted-foreground">No users match that search.</p>}
        </div>
        {visible.length < filtered.length && (
          <button onClick={() => setLimit(l => l + 25)} className="mt-3 w-full rounded-lg bg-secondary py-2 text-xs text-foreground hover:opacity-90 btn-hover">
            Load more ({filtered.length - visible.length} remaining)
          </button>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
