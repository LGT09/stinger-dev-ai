import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Key, Plus, Trash2, Eye, EyeOff, Lock, Save, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Secret {
  id: string;
  key: string;
  value: string;
  project?: string;
}

const SecretsManager = () => {
  const [secrets, setSecrets] = useState<Secret[]>(() => {
    const saved = localStorage.getItem("stinger-env-secrets");
    return saved ? JSON.parse(saved) : [];
  });
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newProject, setNewProject] = useState("");
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set());

  const save = (updated: Secret[]) => {
    setSecrets(updated);
    localStorage.setItem("stinger-env-secrets", JSON.stringify(updated));
  };

  const addSecret = () => {
    if (!newKey.trim() || !newValue.trim()) {
      toast.error("Key and value are required");
      return;
    }
    if (secrets.some(s => s.key === newKey && s.project === newProject)) {
      toast.error("Secret with this key already exists");
      return;
    }
    const secret: Secret = { id: Date.now().toString(), key: newKey.toUpperCase().replace(/\s+/g, "_"), value: newValue, project: newProject || undefined };
    save([...secrets, secret]);
    setNewKey("");
    setNewValue("");
    setNewProject("");
    toast.success("Secret added");
  };

  const removeSecret = (id: string) => {
    save(secrets.filter(s => s.id !== id));
    toast.success("Secret removed");
  };

  const toggleVisibility = (id: string) => {
    setVisibleSecrets(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2">
          <Key size={16} className="text-primary" />
          <p className="text-sm text-muted-foreground">Environment Secrets</p>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Manage API keys and secrets for your AI-generated projects</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Plus size={14} className="text-primary" />
          <p className="text-xs font-medium text-foreground">Add New Secret</p>
        </div>

        <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertTriangle size={12} className="text-destructive flex-shrink-0" />
          <p className="text-[10px] text-destructive">Secrets are stored locally in your browser. Never share your screen while secrets are visible.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="KEY_NAME" className="bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono" />
          <input value={newValue} onChange={e => setNewValue(e.target.value)} placeholder="secret_value" type="password" className="bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono" />
          <input value={newProject} onChange={e => setNewProject(e.target.value)} placeholder="Project (optional)" className="bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
        </div>
        <button onClick={addSecret} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 btn-hover">
          <Save size={12} /> Save Secret
        </button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Lock size={14} className="text-accent" />
          <p className="text-xs font-medium text-foreground">Your Secrets ({secrets.length})</p>
        </div>
        {secrets.length === 0 ? (
          <p className="text-xs text-muted-foreground">No secrets configured yet. Add your API keys above.</p>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {secrets.map(s => (
                <motion.div key={s.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-all group">
                  <Key size={12} className="text-primary flex-shrink-0" />
                  <span className="text-xs font-mono text-foreground font-medium min-w-[100px]">{s.key}</span>
                  <span className="text-xs font-mono text-muted-foreground flex-1 truncate">
                    {visibleSecrets.has(s.id) ? s.value : "••••••••••"}
                  </span>
                  {s.project && <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent">{s.project}</span>}
                  <button onClick={() => toggleVisibility(s.id)} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
                    {visibleSecrets.has(s.id) ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                  <button onClick={() => removeSecret(s.id)} className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 size={12} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default SecretsManager;
