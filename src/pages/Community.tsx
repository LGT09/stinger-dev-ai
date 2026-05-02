import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Globe, Heart, GitFork, Eye, Code, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const Community = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [viewCode, setViewCode] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPublished();
  }, []);

  const loadPublished = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Failed to load community projects:", error);
      toast.error("Failed to load projects");
    }
    if (data) setProjects(data);
    setLoading(false);
  };

  // Load author names separately
  const [authors, setAuthors] = useState<Record<string, { name: string; verified: boolean }>>({});
  useEffect(() => {
    if (projects.length === 0) return;
    const userIds = [...new Set(projects.map(p => p.user_id))];
    supabase.from("profiles").select("user_id, display_name, is_verified").in("user_id", userIds).then(({ data }) => {
      if (data) {
        const map: Record<string, { name: string; verified: boolean }> = {};
        data.forEach(p => { map[p.user_id] = { name: p.display_name || "Anonymous", verified: p.is_verified }; });
        setAuthors(map);
      }
    });
  }, [projects]);

  const forkProject = async (project: any) => {
    if (!user) { toast.error("Sign in to fork"); return; }
    const { error } = await supabase.from("projects").insert({
      user_id: user.id,
      name: `${project.name} (fork)`,
      description: project.description,
      code_content: project.code_content,
      language: project.language,
      status: "Draft",
    });
    if (error) toast.error("Failed to fork");
    else {
      toast.success("Project forked to your projects!");
      // Increment fork count
      await supabase.from("projects").update({ forks: (project.forks || 0) + 1 }).eq("id", project.id);
      loadPublished();
    }
  };

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description || "").toLowerCase().includes(search.toLowerCase())
  );

  // Extract [cover:url] from description, return clean description + cover url
  const extractCover = (desc: string | null): { cover: string | null; clean: string } => {
    if (!desc) return { cover: null, clean: "" };
    const m = desc.match(/\[cover:(.*?)\]/);
    if (!m) return { cover: null, clean: desc };
    return { cover: m[1].trim(), clean: desc.replace(m[0], "").trim() };
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe size={16} className="text-primary" />
          <p className="text-sm text-muted-foreground">Community Projects</p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="pl-8 pr-3 py-1.5 bg-secondary rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 w-40"
          />
        </div>
      </div>

      {viewCode && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-foreground">{viewCode.name}</p>
            <button onClick={() => setViewCode(null)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><X size={12} /> Close</button>
          </div>
          <pre className="bg-secondary rounded-lg p-4 text-xs text-foreground overflow-auto max-h-96 font-mono">
            {viewCode.code_content || "No code available for preview."}
          </pre>
        </motion.div>
      )}

      {loading ? (
        <div className="glass rounded-xl p-8 text-center">
          <div className="animate-pulse text-primary text-sm">Loading community projects...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center">
          <Globe size={24} className="text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {search ? "No matching projects found" : "No community projects yet. Be the first to publish!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((app, i) => {
            const author = authors[app.user_id];
            const { cover, clean } = extractCover(app.description);
            return (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass rounded-xl p-4 hover:glow-cyan transition-all cursor-pointer group hover:scale-[1.02]"
              >
                <div className="w-full h-24 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 mb-3 flex items-center justify-center overflow-hidden">
                  {cover ? (
                    <img src={cover} alt={app.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <Globe size={24} className="text-muted-foreground/50 group-hover:text-primary/50 transition-colors" />
                  )}
                </div>
                <p className="text-sm font-medium text-foreground">{app.name}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <span>by {author?.name || "Anonymous"}</span>
                  {author?.verified && <span className="text-blue-400">✔</span>}
                </div>
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{clean || app.language}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Heart size={12} /> {app.likes}</span>
                  <span className="flex items-center gap-1"><GitFork size={12} /> {app.forks}</span>
                  <span className="flex items-center gap-1"><Eye size={12} /> {app.views}</span>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/30">
                  <button onClick={() => setViewCode(app)} className="flex-1 flex items-center justify-center gap-1 text-xs text-primary hover:bg-primary/10 py-1.5 rounded-lg transition-all">
                    <Code size={12} /> View Code
                  </button>
                  <button onClick={() => forkProject(app)} className="flex-1 flex items-center justify-center gap-1 text-xs text-accent hover:bg-accent/10 py-1.5 rounded-lg transition-all">
                    <GitFork size={12} /> Fork
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Community;
