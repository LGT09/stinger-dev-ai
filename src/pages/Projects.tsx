import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, FolderKanban, MoreHorizontal, Clock, Eye, Download, Trash2, Globe, Code } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const statusColor: Record<string, string> = {
  Active: "bg-accent/20 text-accent",
  Published: "bg-primary/20 text-primary",
  Draft: "bg-muted text-muted-foreground",
};

const Projects = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newLang, setNewLang] = useState("React");
  const [viewProject, setViewProject] = useState<any>(null);

  useEffect(() => {
    if (user) loadProjects();
  }, [user]);

  const loadProjects = async () => {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", user!.id)
      .order("updated_at", { ascending: false });
    if (data) setProjects(data);
  };

  const createProject = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase.from("projects").insert({
      user_id: user!.id,
      name: newName,
      description: newDesc,
      language: newLang,
      status: "Draft",
    });
    if (error) toast.error("Failed to create project");
    else {
      toast.success("Project created");
      setShowNew(false);
      setNewName("");
      setNewDesc("");
      loadProjects();
    }
  };

  const deleteProject = async (id: string) => {
    await supabase.from("projects").delete().eq("id", id);
    toast.success("Project deleted");
    loadProjects();
  };

  const togglePublish = async (id: string, current: boolean) => {
    await supabase.from("projects").update({
      is_published: !current,
      status: !current ? "Published" : "Draft",
    }).eq("id", id);
    toast.success(!current ? "Published to community" : "Unpublished");
    loadProjects();
  };

  const downloadProject = (project: any) => {
    const content = project.code_content || `// ${project.name}\n// Language: ${project.language}\n// Description: ${project.description || "No description"}\n\nconsole.log("Hello from ${project.name}");`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, "-").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Your projects</p>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={14} /> New project
        </button>
      </div>

      {showNew && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-4 space-y-3">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Project name" className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
          <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description" className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
          <select value={newLang} onChange={(e) => setNewLang(e.target.value)} className="bg-secondary rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none">
            {["React", "Next.js", "Python", "Node.js", "React Native", "Vue", "Angular"].map((l) => <option key={l}>{l}</option>)}
          </select>
          <div className="flex gap-2">
            <button onClick={createProject} className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-medium">Create</button>
            <button onClick={() => setShowNew(false)} className="text-xs text-muted-foreground">Cancel</button>
          </div>
        </motion.div>
      )}

      {/* View project code modal */}
      {viewProject && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-foreground">{viewProject.name} — Code</p>
            <button onClick={() => setViewProject(null)} className="text-xs text-muted-foreground">Close</button>
          </div>
          <pre className="bg-secondary rounded-lg p-4 text-xs text-foreground overflow-auto max-h-96 font-mono">
            {viewProject.code_content || "No code content yet. Use AI Studio to generate code for this project."}
          </pre>
        </motion.div>
      )}

      <div className="grid gap-3">
        {projects.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <FolderKanban size={24} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No projects yet. Create your first one!</p>
          </div>
        ) : (
          projects.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-xl p-4 flex flex-wrap items-center gap-3"
            >
              <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                <FolderKanban size={16} className="text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-[120px]">
                <p className="text-sm font-medium text-foreground">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.language}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[p.status] || statusColor.Draft}`}>
                {p.status}
              </span>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock size={12} /> {new Date(p.updated_at).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setViewProject(p)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground" title="View code">
                  <Code size={14} />
                </button>
                <button onClick={() => downloadProject(p)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground" title="Download">
                  <Download size={14} />
                </button>
                <button onClick={() => togglePublish(p.id, p.is_published)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground" title={p.is_published ? "Unpublish" : "Publish"}>
                  <Globe size={14} className={p.is_published ? "text-primary" : ""} />
                </button>
                <button onClick={() => deleteProject(p.id)} className="p-1.5 rounded-lg hover:bg-secondary text-destructive" title="Delete">
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default Projects;
