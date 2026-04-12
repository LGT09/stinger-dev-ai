import { motion } from "framer-motion";
import { Plus, FolderKanban, MoreHorizontal, Clock } from "lucide-react";

const mockProjects = [
  { name: "E-commerce App", status: "Active", updated: "2h ago", lang: "React + Node" },
  { name: "Portfolio Site", status: "Published", updated: "1d ago", lang: "React" },
  { name: "Chat Bot API", status: "Draft", updated: "3d ago", lang: "Python" },
  { name: "Mobile App", status: "Active", updated: "5h ago", lang: "React Native" },
];

const statusColor: Record<string, string> = {
  Active: "bg-accent/20 text-accent",
  Published: "bg-primary/20 text-primary",
  Draft: "bg-muted text-muted-foreground",
};

const Projects = () => (
  <div className="p-6 max-w-5xl mx-auto space-y-6">
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">Your projects</p>
      <button className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity">
        <Plus size={14} /> New project
      </button>
    </div>

    <div className="grid gap-3">
      {mockProjects.map((p, i) => (
        <motion.div
          key={p.name}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="glass rounded-xl p-4 flex items-center gap-4 hover:glow-yellow transition-shadow cursor-pointer"
        >
          <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
            <FolderKanban size={16} className="text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{p.name}</p>
            <p className="text-xs text-muted-foreground">{p.lang}</p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[p.status]}`}>
            {p.status}
          </span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock size={12} /> {p.updated}
          </div>
          <button className="text-muted-foreground hover:text-foreground">
            <MoreHorizontal size={16} />
          </button>
        </motion.div>
      ))}
    </div>
  </div>
);

export default Projects;
