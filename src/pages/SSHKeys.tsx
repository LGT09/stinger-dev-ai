import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TerminalSquare, Plus, Copy, ShieldOff, Clock, Loader2, Check, Play, Cpu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AI_MODELS, DEFAULT_MODEL_ID } from "@/lib/aiModels";
import { STINGER_LOGO } from "@/lib/branding";
import { toast } from "sonner";

const SCOPES = [
  { id: "chat", label: "Prompt AI" },
  { id: "models", label: "Switch models" },
  { id: "deploy", label: "Deploy sites" },
  { id: "files", label: "Read project files" },
];

const GATEWAY = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ssh-gateway`;

/** Bash shim users paste into any foreign terminal to drive Stinger by key. */
const CONNECT_CMD = [
  `export STINGER_KEY="sk_stg_…"`,
  `stinger() { c="\${1:-menu}"; shift; curl -s ${GATEWAY} -H 'Content-Type: application/json' \\`,
  `  -d "$(python3 -c 'import json,sys;print(json.dumps({"key":sys.argv[1],"command":sys.argv[2],"args":{"prompt":" ".join(sys.argv[3:])}}))' "$STINGER_KEY" "$c" "$@")" \\`,
  `  | python3 -c 'import json,sys;d=json.load(sys.stdin);print(d.get("output") or d.get("error"))'; }`,
  `stinger menu`,
].join("\n");



const randomKey = () => {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const body = Array.from(bytes).map(b => b.toString(36).padStart(2, "0")).join("").slice(0, 40);
  return `sk_stg_${body}`;
};

const sha256 = async (s: string) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
};

const remaining = (iso: string) => {
  const mins = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  if (mins <= 0) return "expired";
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m left` : `${mins}m left`;
};

/** Stinger SSH — device keys that unlock the platform from any terminal. */
const SSHKeys = () => {
  const { user } = useAuth();
  const [keys, setKeys] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("My laptop");
  const [projectId, setProjectId] = useState("");
  const [scopes, setScopes] = useState<string[]>(SCOPES.map(s => s.id));
  const [creating, setCreating] = useState(false);
  const [freshKey, setFreshKey] = useState<string | null>(null);

  // Terminal playground
  const [termKey, setTermKey] = useState("");
  const [model, setModel] = useState(DEFAULT_MODEL_ID);
  const [cmd, setCmd] = useState("help");
  const [running, setRunning] = useState(false);
  const [out, setOut] = useState<string[]>(["Stinger SSH ready. Paste a key, then run a command."]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [k, p] = await Promise.all([
      supabase.from("project_ssh_keys").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("projects").select("id, name").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(50),
    ]);
    setKeys(k.data || []);
    setProjects(p.data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const chatModels = useMemo(() => AI_MODELS.filter(m => m.category !== "music"), []);

  const createKey = async () => {
    if (!user) return;
    setCreating(true);
    try {
      const key = randomKey();
      const { error } = await supabase.from("project_ssh_keys").insert({
        user_id: user.id,
        project_id: projectId || null,
        label: label.trim() || "Terminal key",
        key_prefix: key.slice(0, 12),
        key_hash: await sha256(key),
        scopes,
        expires_at: new Date(Date.now() + 1440 * 60000).toISOString(),
      });
      if (error) throw error;
      setFreshKey(key);
      setTermKey(key);
      toast.success("SSH key created — copy it now, it is shown once.");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Could not create key");
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id: string) => {
    if (!confirm("Revoke this key? It is deleted immediately and any device using it loses access.")) return;
    // Revoked keys are purged from the database rather than kept as dead rows.
    const { error } = await supabase.from("project_ssh_keys").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Key revoked and removed");
    load();
  };

  const run = async () => {
    if (!termKey.trim()) return toast.error("Paste a Stinger SSH key first");
    const raw = cmd.trim();
    if (!raw) return;
    setRunning(true);
    setOut(prev => [...prev, `$ stinger ${raw}`]);
    try {
      const [name, ...rest] = raw.split(/\s+/);
      const args: Record<string, string> = { model };
      for (let i = 0; i < rest.length; i++) {
        if (rest[i].startsWith("--")) { args[rest[i].slice(2)] = rest[i + 1]?.replace(/^"|"$/g, "") ?? "true"; i++; }
      }
      if ((name === "prompt" || name === "chat") && !args.prompt) args.prompt = rest.join(" ").replace(/^"|"$/g, "");
      const res = await fetch(GATEWAY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: termKey.trim(), command: name, args }),
      });
      const data = await res.json();
      const text = data.output || data.error || JSON.stringify(data, null, 2);
      setOut(prev => [...prev, typeof text === "string" ? text : JSON.stringify(text, null, 2)]);
      if (name === "revoke") load();
    } catch (e: any) {
      setOut(prev => [...prev, `error: ${e.message}`]);
    } finally {
      setRunning(false);
      setCmd("");
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl">
      <div className="flex items-start gap-3">
        <img src={STINGER_LOGO} alt="Stinger AI Dev" className="w-11 h-11 object-contain" />
        <div>
          <h1 className="text-2xl font-semibold text-gradient">Stinger SSH</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create a device key and drive Stinger from any terminal — prompt the AI, switch models, deploy and read projects.
            Keys expire after <span className="text-primary font-medium">1440 minutes</span> and can be revoked any time.
          </p>
        </div>
      </div>

      {/* Always-visible connect command */}
      <div className="glass rounded-2xl p-5 liquid-chrome space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm font-medium text-foreground flex items-center gap-2"><TerminalSquare size={14} className="text-primary" /> Connect from any terminal</p>
          <button onClick={() => { navigator.clipboard.writeText(CONNECT_CMD); toast.success("Bash command copied"); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium bg-primary/15 text-primary hover:bg-primary/25 transition-all btn-hover">
            <Copy size={12} /> Copy bash command
          </button>
        </div>
        <pre className="bg-background/70 border border-border/50 rounded-xl p-3 text-[11px] leading-relaxed text-primary/90 overflow-auto whitespace-pre">{CONNECT_CMD}</pre>
        <p className="text-[11px] text-muted-foreground">
          Paste it into any bash/zsh shell, replace <code className="text-primary font-mono">sk_stg_…</code> with your key, then run <code className="text-primary font-mono">stinger menu</code>.
        </p>
      </div>



      {/* Create */}
      <div className="glass rounded-2xl p-5 liquid-chrome space-y-4">
        <p className="text-sm font-medium text-foreground flex items-center gap-2"><Plus size={14} className="text-primary" /> New SSH key</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-[11px] text-muted-foreground">Label</span>
            <input value={label} onChange={e => setLabel(e.target.value)}
              className="w-full bg-secondary/50 border border-border/60 rounded-xl px-3 py-2 text-xs text-foreground outline-none focus:border-primary/60" />
          </label>
          <label className="space-y-1.5">
            <span className="text-[11px] text-muted-foreground">Scope to a project (optional)</span>
            <select value={projectId} onChange={e => setProjectId(e.target.value)}
              className="w-full bg-secondary/50 border border-border/60 rounded-xl px-3 py-2 text-xs text-foreground outline-none focus:border-primary/60">
              <option value="">All my projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          {SCOPES.map(s => {
            const on = scopes.includes(s.id);
            return (
              <button key={s.id} onClick={() => setScopes(prev => on ? prev.filter(x => x !== s.id) : [...prev, s.id])}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all btn-hover ${on ? "bg-primary/20 text-primary border border-primary/40" : "bg-secondary/60 text-muted-foreground border border-transparent"}`}>
                {on && <Check size={10} className="inline mr-1" />}{s.label}
              </button>
            );
          })}
        </div>
        <button onClick={createKey} disabled={creating}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-medium btn-hover disabled:opacity-60 inline-flex items-center gap-2">
          {creating ? <Loader2 size={13} className="animate-spin" /> : <TerminalSquare size={13} />} Generate key
        </button>

        {freshKey && (
          <div className="rounded-xl border border-primary/40 bg-primary/5 p-3 space-y-2">
            <p className="text-[11px] text-muted-foreground">Copy this key now — it is never shown again.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[11px] font-mono text-primary break-all">{freshKey}</code>
              <button onClick={() => { navigator.clipboard.writeText(freshKey); toast.success("Key copied"); }}
                className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary"><Copy size={13} /></button>
            </div>
            <pre className="text-[10px] text-muted-foreground bg-background/60 rounded-lg p-2 overflow-x-auto">{`curl -s ${GATEWAY} \\
  -H "Content-Type: application/json" \\
  -d '{"key":"${freshKey}","command":"prompt","args":{"prompt":"Build me a landing page"}}'`}</pre>
          </div>
        )}
      </div>

      {/* Keys */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">Your keys</p>
        {loading ? (
          <div className="glass rounded-2xl p-8 text-center text-xs text-muted-foreground"><Loader2 className="animate-spin mx-auto mb-2" size={16} /> Loading…</div>
        ) : keys.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center text-xs text-muted-foreground">No SSH keys yet.</div>
        ) : keys.map((k, i) => {
          const expired = new Date(k.expires_at) < new Date();
          return (
            <motion.div key={k.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="glass rounded-2xl p-4 liquid-chrome flex flex-wrap items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><TerminalSquare size={15} className="text-primary" /></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-foreground truncate">{k.label}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${k.revoked ? "bg-destructive/15 text-destructive" : expired ? "bg-muted text-muted-foreground" : "bg-accent/20 text-accent"}`}>
                    {k.revoked ? "revoked" : expired ? "expired" : "active"}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate font-mono">{k.key_prefix}••••••••</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Clock size={9} /> {remaining(k.expires_at)} · {k.uses} uses · {(k.scopes || []).join(", ")}
                  {k.last_ip ? ` · last IP ${k.last_ip}` : ""}
                </p>
              </div>
              {!k.revoked && (
                <button onClick={() => revoke(k.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all">
                  <ShieldOff size={12} /> Revoke
                </button>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Command reference */}
      <div className="glass rounded-2xl p-5 liquid-chrome space-y-2">
        <p className="text-sm font-medium text-foreground flex items-center gap-2"><Cpu size={14} className="text-accent" /> Activities available over SSH</p>
        <pre className="bg-background/70 border border-border/50 rounded-xl p-3 text-[11px] leading-relaxed text-muted-foreground overflow-auto whitespace-pre-wrap">{`stinger menu                       # chalk logo + activity menu
stinger whoami                     # account, plan, tokens, key expiry
stinger models                     # list models  ·  stinger model --model gaga-ai-nexus
stinger projects                   # your projects
stinger cat --project_id <id>      # print project source
stinger prompt "build a shop"      # chat / code with Stinger AI
stinger deploy --project_id <id>   # publish a live site
stinger builds                     # recent app builds
stinger revoke                     # kill this key`}</pre>
      </div>

    </div>
  );
};

export default SSHKeys;
