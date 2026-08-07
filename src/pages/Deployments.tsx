import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Globe, ExternalLink, Power, PowerOff, Trash2, Terminal, Copy, Loader2, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { undeployProject, redeployProject, deleteDeployment } from "@/lib/deploy";
import { toast } from "sonner";

/** Manage every site the user has deployed on Stinger: status, logs, undeploy, delete. */
const Deployments = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openLogs, setOpenLogs] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("deployments")
      .select("id, username, slug, title, status, url, visits, logs, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    setRows(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const act = async (id: string, fn: () => Promise<void>, msg: string) => {
    setBusy(id);
    try { await fn(); toast.success(msg); await load(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gradient">Deployments</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every site you host on Stinger lives at <code className="text-primary">/username/site-name</code>.
        </p>
      </div>

      {loading ? (
        <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">
          <Loader2 className="animate-spin mx-auto mb-2" size={18} /> Loading deployments…
        </div>
      ) : rows.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center liquid-chrome">
          <Rocket size={36} className="mx-auto mb-3 text-primary" />
          <p className="text-sm font-medium text-foreground">No sites deployed yet</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Deploy a web project from the Projects page.</p>
          <Link to="/projects" className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium btn-hover">
            Go to Projects
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((d, i) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="glass rounded-2xl p-5 liquid-chrome"
            >
              <div className="flex items-start gap-4 flex-wrap">
                <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Globe size={18} className="text-primary" />
                </div>
                <div className="min-w-0 flex-1 basis-52">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground truncate">{d.title}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${d.status === "live" ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"}`}>
                      {d.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-1 font-mono">/{d.username}/{d.slug}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{d.visits || 0} visits</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                  <a href={`/${d.username}/${d.slug}`} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-medium bg-primary/15 text-primary hover:bg-primary/25 transition-all btn-hover">
                    <ExternalLink size={13} /> Open
                  </a>
                  <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/${d.username}/${d.slug}`); toast.success("Link copied"); }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-medium bg-secondary/70 text-muted-foreground hover:text-foreground transition-all">
                    <Copy size={13} /> Copy
                  </button>
                  <button onClick={() => setOpenLogs(openLogs === d.id ? null : d.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-medium bg-secondary/70 text-muted-foreground hover:text-foreground transition-all">
                    <Terminal size={13} /> Logs
                  </button>
                  {d.status === "live" ? (
                    <button disabled={busy === d.id}
                      onClick={() => act(d.id, () => undeployProject(d.id), "Site taken offline")}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-medium bg-secondary/70 text-muted-foreground hover:text-yellow-400 transition-all disabled:opacity-50">
                      <PowerOff size={13} /> Offline
                    </button>
                  ) : (
                    <button disabled={busy === d.id}
                      onClick={() => act(d.id, () => redeployProject(d.id), "Site is live again")}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-medium bg-accent/15 text-accent hover:bg-accent/25 transition-all disabled:opacity-50">
                      <Power size={13} /> Go live
                    </button>
                  )}
                  <button disabled={busy === d.id}
                    onClick={() => { if (confirm(`Delete the deployment at /${d.username}/${d.slug}? The name becomes available again.`)) act(d.id, () => deleteDeployment(d.id), "Deployment deleted"); }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all disabled:opacity-50">
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>

              {openLogs === d.id && (
                <pre className="mt-4 bg-background/70 border border-border/50 rounded-xl p-3 text-[11px] leading-relaxed text-muted-foreground overflow-x-auto">
{(Array.isArray(d.logs) && d.logs.length ? d.logs : ["No logs recorded for this deployment."]).join("\n")}
                </pre>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Deployments;
