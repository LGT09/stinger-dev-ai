import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Globe, Heart, GitFork, Eye, Code } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Community = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [viewCode, setViewCode] = useState<any>(null);

  useEffect(() => {
    loadPublished();
  }, []);

  const loadPublished = async () => {
    const { data } = await supabase
      .from("projects")
      .select("*, profiles!projects_user_id_fkey(display_name, is_verified)")
      .eq("is_published", true)
      .order("created_at", { ascending: false });
    if (data) setProjects(data);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Globe size={16} className="text-primary" />
        <p className="text-sm text-muted-foreground">Community projects</p>
      </div>

      {viewCode && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-foreground">{viewCode.name}</p>
            <button onClick={() => setViewCode(null)} className="text-xs text-muted-foreground">Close</button>
          </div>
          <pre className="bg-secondary rounded-lg p-4 text-xs text-foreground overflow-auto max-h-96 font-mono">
            {viewCode.code_content || "No code available for preview."}
          </pre>
        </motion.div>
      )}

      {projects.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center">
          <Globe size={24} className="text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No community projects yet. Be the first to publish!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((app, i) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-xl p-4 hover:glow-cyan transition-shadow cursor-pointer group"
            >
              <div className="w-full h-24 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 mb-3 flex items-center justify-center">
                <Globe size={24} className="text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-foreground">{app.name}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <span>by {(app as any).profiles?.display_name || "Anonymous"}</span>
                {(app as any).profiles?.is_verified && <span className="text-blue-400">✔</span>}
              </div>
              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{app.description || app.language}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Heart size={12} /> {app.likes}</span>
                <span className="flex items-center gap-1"><Eye size={12} /> {app.views}</span>
                <button onClick={() => setViewCode(app)} className="ml-auto flex items-center gap-1 text-primary hover:underline">
                  <Code size={12} /> View
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Community;
