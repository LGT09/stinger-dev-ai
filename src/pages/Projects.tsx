import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, FolderKanban, Clock, Download, Trash2, Globe, Edit3, ArrowRightLeft, X, GitBranch, Copy, Share2, Eye, Image as ImageIcon, Loader2, Rocket, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { parseProjectFiles, downloadProjectAsZip } from "@/lib/projectFiles";
import { deployProject } from "@/lib/deploy";

const statusColor: Record<string, string> = {
  Active: "bg-accent/20 text-accent",
  Published: "bg-primary/20 text-primary",
  Draft: "bg-muted text-muted-foreground",
};

const Projects = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newLang, setNewLang] = useState("React");
  const [editProject, setEditProject] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editLang, setEditLang] = useState("");
  const [transferProject, setTransferProject] = useState<any>(null);
  const [transferEmail, setTransferEmail] = useState("");
  const [deployingId, setDeployingId] = useState<string | null>(null);
  const [deployments, setDeployments] = useState<Record<string, string>>({});

  // Publish-to-community modal state
  const [publishProject, setPublishProject] = useState<any>(null);
  const [pubName, setPubName] = useState("");
  const [pubDesc, setPubDesc] = useState("");
  const [pubCover, setPubCover] = useState<string>("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Push modal (multi-target: github / codeverse / both)
  const [ghProject, setGhProject] = useState<any>(null);
  const [pushTarget, setPushTarget] = useState<"github" | "codeverse" | "both">("github");
  const [repoName, setRepoName] = useState("");
  const [repoPrivate, setRepoPrivate] = useState(false);
  const [repoDesc, setRepoDesc] = useState("");
  const [pushing, setPushing] = useState(false);

  useEffect(() => { if (user) loadProjects(); }, [user]);

  const loadProjects = async () => {
    const { data } = await supabase.from("projects").select("*").eq("user_id", user!.id).order("updated_at", { ascending: false });
    if (data) setProjects(data);
    const { data: deps } = await supabase.from("deployments").select("project_id, username, slug").eq("user_id", user!.id);
    if (deps) {
      const map: Record<string, string> = {};
      deps.forEach(d => { if (d.project_id) map[d.project_id] = `/${d.username}/${d.slug}`; });
      setDeployments(map);
    }
  };

  const handleDeploy = async (p: any) => {
    if (!user) return;
    const username = (profile as any)?.username || user.email?.split("@")[0] || user.id.slice(0, 8);
    const siteName = window.prompt("Name this site (used in the URL)", p.name)?.trim();
    if (!siteName) return;
    setDeployingId(p.id);
    try {
      const res = await deployProject(p, username, user.id, siteName);
      setDeployments(prev => ({ ...prev, [p.id]: res.path }));
      navigator.clipboard.writeText(res.url).catch(() => {});
      toast.success(`Live at ${res.path} — link copied`);
    } catch (e: any) {
      toast.error(e.message || "Deploy failed");
    } finally {
      setDeployingId(null);
    }
  };

  const createProject = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase.from("projects").insert({
      user_id: user!.id, name: newName, description: newDesc, language: newLang, status: "Draft",
    });
    if (error) toast.error("Failed to create project");
    else { toast.success("Project created"); setShowNew(false); setNewName(""); setNewDesc(""); loadProjects(); }
  };

  const deleteProject = async (id: string) => {
    if (!confirm("Delete this project?")) return;
    await supabase.from("projects").delete().eq("id", id);
    toast.success("Project deleted");
    loadProjects();
  };

  const openEdit = (p: any) => {
    setEditProject(p); setEditName(p.name); setEditDesc(p.description || ""); setEditLang(p.language || "React");
  };

  const saveEdit = async () => {
    if (!editProject) return;
    const { error } = await supabase.from("projects").update({
      name: editName, description: editDesc, language: editLang,
    }).eq("id", editProject.id);
    if (error) toast.error("Failed to update");
    else { toast.success("Project updated"); setEditProject(null); loadProjects(); }
  };

  const handleTransfer = async () => {
    if (!transferEmail.trim() || !transferProject) return;
    const { data: targetProfile } = await supabase.from("profiles").select("user_id").eq("email", transferEmail.trim()).maybeSingle();
    if (!targetProfile) { toast.error("User not found. Make sure they have a Stinger Dev account."); return; }
    const { error } = await supabase.from("projects").update({ user_id: targetProfile.user_id }).eq("id", transferProject.id);
    if (error) toast.error("Transfer failed");
    else { toast.success(`Project transferred to ${transferEmail}`); setTransferProject(null); setTransferEmail(""); loadProjects(); }
  };

  // Publish to community with cover image
  const openPublish = (p: any) => {
    setPublishProject(p);
    setPubName(p.name);
    setPubDesc(p.description || "");
    setPubCover("");
  };

  const uploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Max 2MB"); return; }
    setUploadingCover(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/covers/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast.error("Upload failed"); setUploadingCover(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    setPubCover(publicUrl);
    setUploadingCover(false);
    toast.success("Cover uploaded");
  };

  const submitPublish = async () => {
    if (!publishProject) return;
    if (!pubName.trim()) { toast.error("Name is required"); return; }
    const desc = pubCover ? `[cover:${pubCover}]\n${pubDesc}` : pubDesc;
    const { error } = await supabase.from("projects").update({
      name: pubName, description: desc, is_published: true, status: "Published",
    }).eq("id", publishProject.id);
    if (error) toast.error("Publish failed");
    else { toast.success("Published to community 🎉"); setPublishProject(null); loadProjects(); }
  };

  const unpublish = async (id: string) => {
    await supabase.from("projects").update({ is_published: false, status: "Draft" }).eq("id", id);
    toast.success("Unpublished");
    loadProjects();
  };

  // Download as ZIP
  const downloadZip = async (project: any) => {
    const files = parseProjectFiles(project.code_content, `${project.name}.txt`);
    await downloadProjectAsZip(project.name, files);
    toast.success(`Downloaded ${project.name}.zip`);
  };

  // Push (GitHub / CodeVerse / Both)
  const openGhPush = (p: any) => {
    setGhProject(p);
    const ghT = localStorage.getItem("github_token");
    const cvT = localStorage.getItem("codeverse_token");
    setPushTarget(ghT && cvT ? "both" : ghT ? "github" : cvT ? "codeverse" : "github");
    setRepoName(p.name.replace(/[^a-zA-Z0-9-]+/g, "-").toLowerCase());
    setRepoDesc(p.description || `Created with Stinger AI Dev — ${p.language}`);
    setRepoPrivate(false);
  };

  const pushToGitHubInternal = async (token: string) => {
    const createRes = await fetch("https://api.github.com/user/repos", {
      method: "POST",
      headers: { Authorization: `token ${token}`, "Content-Type": "application/json", Accept: "application/vnd.github+json" },
      body: JSON.stringify({ name: repoName, description: repoDesc, private: repoPrivate, auto_init: true }),
    });
    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      throw new Error(err.message || `GitHub create failed (${createRes.status})`);
    }
    const repo = await createRes.json();
    const owner = repo.owner.login;
    const files = parseProjectFiles(ghProject.code_content, `${ghProject.name}.txt`);
    if (files.length === 0) files.push({ path: "README.md", content: `# ${ghProject.name}\n\nCreated with Stinger AI Dev.` });
    for (const f of files) {
      const content = btoa(unescape(encodeURIComponent(f.content)));
      await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/${f.path}`, {
        method: "PUT",
        headers: { Authorization: `token ${token}`, "Content-Type": "application/json", Accept: "application/vnd.github+json" },
        body: JSON.stringify({ message: `Add ${f.path} via Stinger AI Dev`, content }),
      });
    }
    return { url: repo.html_url, owner };
  };

  const pushToCodeVerseInternal = async () => {
    const token = localStorage.getItem("codeverse_token") || undefined;
    const files = parseProjectFiles(ghProject.code_content, `${ghProject.name}.txt`);
    if (files.length === 0) files.push({ path: "README.md", content: `# ${ghProject.name}\n\nCreated with Stinger AI Dev.` });
    const res = await supabase.functions.invoke("codeverse-push", {
      body: { repoName, description: repoDesc, files, userToken: token, isPrivate: repoPrivate },
    });
    if (res.error) throw new Error(res.error.message || "CodeVerse push failed");
    if ((res.data as any)?.error) throw new Error((res.data as any).error);
    return res.data as any;
  };

  const pushToGitHub = async () => {
    if (!ghProject) return;
    if (!repoName.trim()) { toast.error("Repo name required"); return; }

    const ghToken = localStorage.getItem("github_token");
    const cvToken = localStorage.getItem("codeverse_token");
    if ((pushTarget === "github" || pushTarget === "both") && !ghToken) {
      toast.error("Connect GitHub first in Settings"); return;
    }
    if ((pushTarget === "codeverse" || pushTarget === "both") && !cvToken) {
      toast.error("Connect CodeVerse first (Integrations → CodeVerse)"); return;
    }

    setPushing(true);
    try {
      const tasks: Promise<any>[] = [];
      if (pushTarget === "github" || pushTarget === "both") tasks.push(pushToGitHubInternal(ghToken!));
      if (pushTarget === "codeverse" || pushTarget === "both") tasks.push(pushToCodeVerseInternal());
      const results = await Promise.allSettled(tasks);
      const ok = results.filter(r => r.status === "fulfilled").length;
      const fails = results.filter(r => r.status === "rejected") as PromiseRejectedResult[];
      if (ok > 0) {
        toast.success(`Pushed to ${pushTarget === "both" ? `${ok}/2 targets` : pushTarget}`);
        results.forEach(r => { if (r.status === "fulfilled" && (r as any).value?.url) window.open((r as any).value.url, "_blank"); });
      }
      fails.forEach(f => toast.error(f.reason?.message || "Push failed"));
      if (fails.length === 0) setGhProject(null);
    } catch (e: any) {
      toast.error(e.message || "Push failed");
    } finally {
      setPushing(false);
    }
  };


  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Your projects</p>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-90 btn-hover">
          <Plus size={14} /> New project
        </button>
      </div>

      {showNew && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-4 space-y-3 liquid-chrome">
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Project name" className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
          <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description" className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
          <select value={newLang} onChange={e => setNewLang(e.target.value)} className="bg-secondary rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none">
            {["React", "Next.js", "Python", "Node.js", "React Native", "Vue", "Angular", "SQL", "HTML/CSS"].map(l => <option key={l}>{l}</option>)}
          </select>
          <div className="flex gap-2">
            <button onClick={createProject} className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-medium btn-hover">Create</button>
            <button onClick={() => setShowNew(false)} className="text-xs text-muted-foreground">Cancel</button>
          </div>
        </motion.div>
      )}

      {/* Edit modal */}
      <AnimatePresence>
        {editProject && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground flex items-center gap-2"><Edit3 size={14} className="text-primary" /> Edit Project</p>
              <button onClick={() => setEditProject(null)} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
            </div>
            <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Project name" className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
            <input value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description" className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
            <select value={editLang} onChange={e => setEditLang(e.target.value)} className="bg-secondary rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none">
              {["React", "Next.js", "Python", "Node.js", "React Native", "Vue", "Angular", "SQL", "HTML/CSS"].map(l => <option key={l}>{l}</option>)}
            </select>
            <p className="text-[11px] text-muted-foreground">💡 To edit code/files, click <span className="text-primary">View</span> on the project — full file editor opens.</p>
            <button onClick={saveEdit} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-medium btn-hover">Save Changes</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transfer modal */}
      <AnimatePresence>
        {transferProject && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground flex items-center gap-2"><ArrowRightLeft size={14} className="text-primary" /> Transfer "{transferProject.name}"</p>
              <button onClick={() => setTransferProject(null)} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
            </div>
            <p className="text-xs text-muted-foreground">Enter the email of the user you want to transfer to.</p>
            <input value={transferEmail} onChange={e => setTransferEmail(e.target.value)} placeholder="recipient@email.com" type="email" className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
            <div className="flex gap-2">
              <button onClick={handleTransfer} className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-medium btn-hover">Transfer</button>
              <button onClick={() => setTransferProject(null)} className="text-xs text-muted-foreground">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Publish modal */}
      <AnimatePresence>
        {publishProject && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass rounded-xl p-4 space-y-3 liquid-chrome border-glow">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground flex items-center gap-2"><Globe size={14} className="text-primary" /> Publish to Community</p>
              <button onClick={() => setPublishProject(null)} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
            </div>
            <p className="text-xs text-muted-foreground">Customize how this project appears to everyone on the community page.</p>
            <input value={pubName} onChange={e => setPubName(e.target.value)} placeholder="Public project name" className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
            <textarea value={pubDesc} onChange={e => setPubDesc(e.target.value)} placeholder="Short description" rows={3} className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
            <div className="flex items-center gap-3">
              <div className="w-20 h-20 rounded-lg bg-secondary overflow-hidden flex items-center justify-center border border-border/50">
                {pubCover ? <img src={pubCover} alt="Cover" className="w-full h-full object-cover" /> : <ImageIcon size={20} className="text-muted-foreground" />}
              </div>
              <div className="flex-1">
                <button onClick={() => coverInputRef.current?.click()} disabled={uploadingCover}
                  className="bg-secondary text-foreground px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-secondary/70 btn-hover disabled:opacity-50">
                  {uploadingCover ? "Uploading..." : pubCover ? "Replace cover" : "Upload cover image"}
                </button>
                <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={uploadCover} />
                <p className="text-[10px] text-muted-foreground mt-1">PNG/JPG · max 2MB</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={submitPublish} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-medium btn-hover">
                Publish
              </button>
              <button onClick={() => setPublishProject(null)} className="text-xs text-muted-foreground">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GitHub push modal */}
      <AnimatePresence>
        {ghProject && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass rounded-xl p-4 space-y-3 liquid-chrome border-glow">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground flex items-center gap-2"><GitBranch size={14} className="text-primary" /> Push "{ghProject.name}"</p>
              <button onClick={() => setGhProject(null)} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground mb-1.5">Push target</p>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  { id: "github", label: "GitHub" },
                  { id: "codeverse", label: "CodeVerse" },
                  { id: "both", label: "Both" },
                ] as const).map(opt => (
                  <button key={opt.id} onClick={() => setPushTarget(opt.id)}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${pushTarget === opt.id ? "bg-primary/15 text-primary border-primary/40" : "bg-secondary/50 text-muted-foreground border-border/40 hover:bg-secondary"}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <input value={repoName} onChange={e => setRepoName(e.target.value.replace(/[^a-zA-Z0-9-]+/g, "-"))} placeholder="repo-name" className="w-full bg-secondary rounded-lg px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
            <input value={repoDesc} onChange={e => setRepoDesc(e.target.value)} placeholder="Repo description" className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={repoPrivate} onChange={e => setRepoPrivate(e.target.checked)} className="accent-primary" />
              Make repository private
            </label>
            <div className="flex gap-2">
              <button onClick={pushToGitHub} disabled={pushing} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-medium btn-hover disabled:opacity-50 flex items-center gap-2">
                {pushing ? <><Loader2 size={12} className="animate-spin" /> Pushing...</> : "Create & push"}
              </button>
              <button onClick={() => setGhProject(null)} className="text-xs text-muted-foreground">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Referral banner */}
      {profile?.referral_code && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-xl p-3 flex items-center gap-3 liquid-chrome border-glow">
          <Share2 size={14} className="text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Your referral link — earn tokens!</p>
            <code className="text-[10px] text-foreground font-mono truncate block">{`${window.location.origin}?ref=${profile.referral_code}`}</code>
          </div>
          <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}?ref=${profile.referral_code}`); toast.success("Copied!"); }}
            className="bg-primary text-primary-foreground px-2 py-1 rounded-lg text-[10px] font-medium flex-shrink-0 btn-hover">
            <Copy size={10} />
          </button>
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
            <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.005 }}
              className="glass rounded-xl p-4 flex flex-wrap items-center gap-3 hover-lift liquid-chrome">
              <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                <FolderKanban size={16} className="text-primary" />
              </div>
              <div className="flex-1 min-w-[120px]">
                <p className="text-sm font-medium text-foreground">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.language}{p.description ? ` — ${p.description.replace(/^\[cover:[^\]]+\]\n?/, "").slice(0, 40)}` : ""}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[p.status] || statusColor.Draft}`}>{p.status}</span>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock size={12} /> {new Date(p.updated_at).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                <button onClick={() => navigate(`/projects/${p.id}`)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-all" title="View files & preview">
                  <Eye size={14} />
                </button>
                <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all" title="Edit info">
                  <Edit3 size={14} />
                </button>
                <button onClick={() => downloadZip(p)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all" title="Download ZIP">
                  <Download size={14} />
                </button>
                <button onClick={() => handleDeploy(p)} disabled={deployingId === p.id}
                  className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-all disabled:opacity-50" title="Deploy as live website">
                  {deployingId === p.id ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />}
                </button>
                {deployments[p.id] && (
                  <a href={deployments[p.id]} target="_blank" rel="noreferrer"
                    className="p-1.5 rounded-lg hover:bg-secondary text-primary transition-all" title={`Live at ${deployments[p.id]}`}>
                    <ExternalLink size={14} />
                  </a>
                )}
                <button onClick={() => setTransferProject(p)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all" title="Transfer">
                  <ArrowRightLeft size={14} />
                </button>
                <button onClick={() => openGhPush(p)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all" title="Push to GitHub">
                  <GitBranch size={14} />
                </button>
                {p.is_published ? (
                  <button onClick={() => unpublish(p.id)} className="p-1.5 rounded-lg hover:bg-secondary text-primary transition-all" title="Unpublish">
                    <Globe size={14} />
                  </button>
                ) : (
                  <button onClick={() => openPublish(p)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all" title="Publish to Community">
                    <Globe size={14} />
                  </button>
                )}
                <button onClick={() => deleteProject(p.id)} className="p-1.5 rounded-lg hover:bg-secondary text-destructive transition-all" title="Delete">
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
