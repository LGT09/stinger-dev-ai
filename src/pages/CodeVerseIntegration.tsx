import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GitBranch, Check, X, Save, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";

const TOKEN_KEY = "codeverse_token";

const CodeVerseIntegration = () => {
  const [token, setToken] = useState("");
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => { setSaved(localStorage.getItem(TOKEN_KEY)); }, []);

  const save = () => {
    if (!token.trim().startsWith("cv_")) { toast.error("Token must start with cv_"); return; }
    localStorage.setItem(TOKEN_KEY, token.trim());
    setSaved(token.trim()); setToken("");
    toast.success("CodeVerse token saved — you can now push from the Projects page");
  };
  const remove = () => {
    localStorage.removeItem(TOKEN_KEY); setSaved(null); toast.success("Token removed");
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><GitBranch className="text-primary" /> CodeVerse Integration</h1>
        <p className="text-sm text-muted-foreground mt-1">Connect Stinger to <a href="https://codeverse.stinger.co.zw" target="_blank" rel="noreferrer" className="text-primary hover:underline">codeverse.stinger.co.zw</a> to push generated repos with one click.</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-5 space-y-4 liquid-chrome">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Personal Access Token</p>
          {saved ? <span className="text-xs flex items-center gap-1 text-accent"><Check size={12} /> Connected</span>
                 : <span className="text-xs flex items-center gap-1 text-muted-foreground"><X size={12} /> Not connected</span>}
        </div>
        {saved ? (
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-secondary rounded-lg px-3 py-2 text-xs font-mono truncate">{saved.slice(0, 8)}…{saved.slice(-4)}</code>
            <button onClick={remove} className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20" title="Remove"><Trash2 size={14} /></button>
          </div>
        ) : (
          <>
            <input type="password" value={token} onChange={e => setToken(e.target.value)} placeholder="cv_..." className="w-full bg-secondary rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary/50" />
            <button onClick={save} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 btn-hover">
              <Save size={12} /> Save token
            </button>
          </>
        )}
        <div className="border-t border-border/50 pt-3">
          <p className="text-xs text-muted-foreground mb-2">Get your token at:</p>
          <a href="https://codeverse.stinger.co.zw/settings/tokens" target="_blank" rel="noreferrer"
             className="text-xs text-primary hover:underline inline-flex items-center gap-1">
            codeverse.stinger.co.zw/settings/tokens <ExternalLink size={10} />
          </a>
        </div>
      </motion.div>

      <div className="glass rounded-xl p-5 space-y-2">
        <p className="text-sm font-medium">How push targets work</p>
        <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
          <li><strong>GitHub only</strong> — pushes to your connected GitHub account.</li>
          <li><strong>CodeVerse only</strong> — pushes to codeverse.stinger.co.zw using this token.</li>
          <li><strong>Both</strong> — pushes to GitHub and CodeVerse in parallel.</li>
          <li>Switch between targets in the Projects page push dialog.</li>
        </ul>
      </div>
    </div>
  );
};

export default CodeVerseIntegration;