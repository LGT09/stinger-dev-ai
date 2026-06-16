import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, Search, X, Check, Sparkles } from "lucide-react";
import { AI_MODELS, MODEL_CATEGORIES, getModelById, type AIModelOption } from "@/lib/aiModels";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  selectedId: string;
  onSelect: (id: string) => void;
}

const providerColor: Record<string, string> = {
  anthropic: "from-orange-500/20 to-amber-500/10 border-orange-500/30",
  deepseek: "from-blue-500/20 to-indigo-500/10 border-blue-500/30",
  davidcyril: "from-emerald-500/20 to-teal-500/10 border-emerald-500/30",
  puter: "from-purple-500/20 to-fuchsia-500/10 border-purple-500/30",
  qvac: "from-pink-500/20 to-rose-500/10 border-pink-500/30",
  music: "from-yellow-500/20 to-orange-500/10 border-yellow-500/30",
  hostify: "from-cyan-500/20 to-sky-500/10 border-cyan-500/30",
  gaga: "from-violet-500/20 to-fuchsia-500/10 border-violet-500/30",
};

export default function ModelPickerDialog({ open, onClose, selectedId, onSelect }: Props) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");

  const filtered = useMemo(() => {
    return AI_MODELS.filter(m => {
      if (cat !== "all" && m.category !== cat) return false;
      if (!q) return true;
      const s = q.toLowerCase();
      return m.label.toLowerCase().includes(s) || m.model.toLowerCase().includes(s) || (m.badge || "").toLowerCase().includes(s);
    });
  }, [q, cat]);

  const choose = (m: AIModelOption) => {
    onSelect(m.id);
    toast.success(`Switched to ${m.label}`);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}>
          <motion.div initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 12 }}
            transition={{ type: "spring", damping: 24, stiffness: 280 }}
            className="glass-strong rounded-2xl border border-border/60 max-w-3xl w-full max-h-[80vh] flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-4 border-b border-border/40 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/15"><Sparkles size={16} className="text-primary" /></div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Choose AI model</p>
                <p className="text-[11px] text-muted-foreground">{AI_MODELS.length} models · search and pick the one you need</p>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary"><X size={14} /></button>
            </div>

            {/* Search + categories */}
            <div className="p-3 border-b border-border/40 space-y-2">
              <div className="relative">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search models…" autoFocus
                  className="w-full bg-secondary/60 rounded-lg pl-8 pr-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
              </div>
              <div className="flex gap-1.5 overflow-x-auto">
                {[{ id: "all", label: "All" }, ...MODEL_CATEGORIES].map(c => (
                  <button key={c.id} onClick={() => setCat(c.id)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-all ${cat === c.id ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground hover:bg-secondary"}`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {filtered.map((m, i) => {
                  const sel = m.id === selectedId;
                  return (
                    <motion.button key={m.id} onClick={() => choose(m)}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.015 }}
                      whileHover={{ y: -2, scale: 1.01 }}
                      className={`relative text-left rounded-xl p-3 border bg-gradient-to-br ${providerColor[m.provider] || "from-secondary to-secondary border-border"} ${sel ? "ring-2 ring-primary" : ""}`}>
                      {sel && <Check size={14} className="absolute top-2 right-2 text-primary" />}
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Cpu size={11} className="text-foreground/70" />
                        <span className="text-xs font-semibold text-foreground truncate">{m.label}</span>
                      </div>
                      {m.description && <p className="text-[10px] text-muted-foreground line-clamp-2 mb-1.5">{m.description}</p>}
                      <div className="flex items-center gap-1">
                        {m.badge && <span className="text-[9px] px-1.5 py-0.5 rounded bg-background/40 text-foreground/80">{m.badge}</span>}
                        {m.category && <span className="text-[9px] px-1.5 py-0.5 rounded bg-background/40 text-foreground/60">{m.category}</span>}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
              {filtered.length === 0 && <p className="text-center text-xs text-muted-foreground py-8">No models match "{q}"</p>}
            </div>

            <div className="p-3 border-t border-border/40 text-[10px] text-muted-foreground text-center">
              Selected: <span className="text-primary font-medium">{getModelById(selectedId).label}</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
