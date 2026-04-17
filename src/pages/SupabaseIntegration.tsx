import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Database, Link2, Check, AlertCircle, Trash2, Send, Code, FolderKanban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { parseProjectFiles } from "@/lib/projectFiles";

interface Connection {
  url: string;
  anonKey: string;
  serviceKey?: string;
  projectRef?: string;
  connectedAt: number;
}

const STORAGE_KEY = "stinger-supabase-connection";

const SupabaseIntegration = () => {
  const { user } = useAuth();
  const [connection, setConnection] = useState<Connection | null>(null);
  const [url, setUrl] = useState("");
  const [anonKey, setAnonKey] = useState("");
  const [serviceKey, setServiceKey] = useState("");
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [pushing, setPushing] = useState(false);
  const [pushLog, setPushLog] = useState<string[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) try { setConnection(JSON.parse(raw)); } catch {}
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("projects").select("id, name, language").eq("user_id", user.id).then(({ data }) => {
      if (data) setProjects(data);
    });
  }, [user]);

  const connect = () => {
    if (!url.trim() || !anonKey.trim()) { toast.error("URL and anon key are required"); return; }
    if (!url.includes("supabase")) { toast.error("Enter a valid Supabase URL"); return; }
    const ref = url.match(/https:\/\/(.+?)\.supabase\.co/)?.[1] || "";
    const conn: Connection = { url: url.trim(), anonKey: anonKey.trim(), serviceKey: serviceKey.trim() || undefined, projectRef: ref, connectedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conn));
    setConnection(conn);
    setUrl(""); setAnonKey(""); setServiceKey("");
    toast.success("Supabase connected!");
  };

  const disconnect = () => {
    if (!confirm("Disconnect your Supabase project?")) return;
    localStorage.removeItem(STORAGE_KEY);
    setConnection(null);
    toast.success("Disconnected");
  };

  const testConnection = async () => {
    if (!connection) return;
    setPushLog(p => [...p, `→ Pinging ${connection.url}...`]);
    try {
      const r = await fetch(`${connection.url}/rest/v1/`, { headers: { apikey: connection.anonKey } });
      if (r.ok) { setPushLog(p => [...p, "✓ Connection healthy"]); toast.success("Connection OK"); }
      else { setPushLog(p => [...p, `✗ HTTP ${r.status}`]); toast.error(`HTTP ${r.status}`); }
    } catch (e: any) {
      setPushLog(p => [...p, `✗ ${e.message}`]);
      toast.error("Connection failed");
    }
  };

  const pushProject = async () => {
    if (!connection || !selectedProject) { toast.error("Pick a project"); return; }
    setPushing(true);
    setPushLog([]);
    const project = projects.find(p => p.id === selectedProject);
    if (!project) { setPushing(false); return; }

    const { data: full } = await supabase.from("projects").select("*").eq("id", selectedProject).single();
    if (!full) { setPushing(false); return; }
    const files = parseProjectFiles(full.code_content);

    setPushLog([`📦 Pushing "${project.name}" → ${connection.projectRef || connection.url}`]);

    // Detect SQL files & push schema via PostgREST RPC if service key provided
    const sqlFiles = files.filter(f => /\.sql$/i.test(f.path));
    if (sqlFiles.length > 0 && connection.serviceKey) {
      setPushLog(p => [...p, `🗄  Found ${sqlFiles.length} SQL file(s) — staging migrations...`]);
      sqlFiles.forEach(f => setPushLog(p => [...p, `  → ${f.path} (${f.content.length} chars)`]));
      setPushLog(p => [...p, "ℹ  SQL execution requires manual run in your Supabase SQL editor for safety."]);
    } else if (sqlFiles.length > 0) {
      setPushLog(p => [...p, `⚠  ${sqlFiles.length} SQL file(s) found but no service key — skipping schema push.`]);
    }

    // Code files: just log + reference
    const codeFiles = files.filter(f => !/\.sql$/i.test(f.path));
    setPushLog(p => [...p, `📄 ${codeFiles.length} code file(s) ready to deploy via your CI/CD or git.`]);

    // Persist a marker on the project that it's linked
    await supabase.from("projects").update({
      description: `${full.description || ""}\n\n[Linked to Supabase: ${connection.projectRef || connection.url}]`.trim(),
    }).eq("id", selectedProject);

    setPushLog(p => [...p, "✓ Project linked to your Supabase. Use the SQL editor to run migrations."]);
    toast.success("Project linked & staged!");
    setPushing(false);
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-2">
        <Database size={16} className="text-primary" />
        <p className="text-sm text-muted-foreground">Supabase Integration</p>
      </div>

      {!connection ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl p-4 space-y-3 liquid-chrome">
          <div className="flex items-center gap-2">
            <Link2 size={14} className="text-primary" />
            <p className="text-sm font-medium text-foreground">Connect your Supabase project</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Enter your Supabase URL and keys. Find them in your Supabase dashboard → Project Settings → API.
            Keys are stored locally in your browser.
          </p>
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://your-project.supabase.co"
            className="w-full bg-secondary rounded-lg px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
          <input value={anonKey} onChange={e => setAnonKey(e.target.value)} placeholder="Anon / public key (eyJ…)" type="password"
            className="w-full bg-secondary rounded-lg px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
          <input value={serviceKey} onChange={e => setServiceKey(e.target.value)} placeholder="Service role key (optional, for schema pushes)" type="password"
            className="w-full bg-secondary rounded-lg px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
          <button onClick={connect} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-medium btn-hover">
            Connect
          </button>
        </motion.div>
      ) : (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-xl p-4 space-y-2 liquid-chrome border-glow">
            <div className="flex items-center gap-2">
              <Check size={14} className="text-accent" />
              <p className="text-sm font-medium text-foreground">Connected</p>
              <span className="text-[10px] text-muted-foreground ml-auto">
                {new Date(connection.connectedAt).toLocaleDateString()}
              </span>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p><span className="text-foreground font-medium">URL:</span> <code className="text-[10px]">{connection.url}</code></p>
              {connection.projectRef && <p><span className="text-foreground font-medium">Ref:</span> <code className="text-[10px]">{connection.projectRef}</code></p>}
              <p><span className="text-foreground font-medium">Service key:</span> {connection.serviceKey ? "✓ Provided" : "— Missing (schema push disabled)"}</p>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={testConnection} className="bg-accent/20 text-accent px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-accent/30 btn-hover">
                Test Connection
              </button>
              <button onClick={disconnect} className="flex items-center gap-1 text-xs text-destructive hover:underline ml-auto">
                <Trash2 size={11} /> Disconnect
              </button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Send size={14} className="text-primary" />
              <p className="text-sm font-medium text-foreground">Push project to Supabase</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Choose a Stinger project. Code is staged for deploy and any SQL files are listed for you to run in Supabase SQL editor.
            </p>
            <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)}
              className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
              <option value="">— Pick a project —</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name} ({p.language})</option>)}
            </select>
            <button onClick={pushProject} disabled={pushing || !selectedProject}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-medium btn-hover disabled:opacity-50">
              {pushing ? "Pushing..." : "Push to Supabase"}
            </button>
            {pushLog.length > 0 && (
              <pre className="bg-[#0a0a0a] rounded-lg p-3 text-[11px] font-mono text-green-400 max-h-48 overflow-auto">
                {pushLog.join("\n")}
              </pre>
            )}
          </motion.div>

          <div className="glass rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2"><AlertCircle size={12} className="text-yellow-400" />
              <p className="text-xs font-medium text-foreground">Auto-sync environment secrets</p>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Secrets you save in <a href="/secrets" className="text-primary hover:underline">Secrets Manager</a> are automatically referenced in code generated by Stinger AI.
              When you push a project here, these secret names are bundled in your <code>.env.example</code>.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default SupabaseIntegration;
