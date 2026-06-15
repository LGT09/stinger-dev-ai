import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, FolderTree, FileCode, Save, Download, Eye, Code, FolderOpen, Folder, File as FileIcon, Globe, Plus, Trash2, Smartphone, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { parseProjectFiles, serializeProjectFiles, buildTree, downloadProjectAsZip, isWebProject, buildPreviewHTML, type ParsedFile, type TreeNode } from "@/lib/projectFiles";

const CURSOR_COLORS = ["#f59e0b", "#ec4899", "#8b5cf6", "#3b82f6", "#10b981", "#ef4444"];
function hashStr(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }
const colorFor = (id: string) => CURSOR_COLORS[Math.abs(hashStr(id)) % CURSOR_COLORS.length];

const TreeRow = ({ node, depth, activePath, onSelect }: { node: TreeNode; depth: number; activePath: string; onSelect: (f: ParsedFile) => void }) => {
  const [open, setOpen] = useState(true);
  if (node.isDir) {
    return (
      <div>
        <button onClick={() => setOpen(!open)}
          className="w-full flex items-center gap-1.5 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary/40 rounded transition-all"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}>
          {open ? <FolderOpen size={11} className="text-primary" /> : <Folder size={11} />}
          <span className="truncate">{node.name || "/"}</span>
        </button>
        {open && node.children.map(c => <TreeRow key={c.path} node={c} depth={depth + 1} activePath={activePath} onSelect={onSelect} />)}
      </div>
    );
  }
  return (
    <button onClick={() => node.file && onSelect(node.file)}
      className={`w-full flex items-center gap-1.5 px-2 py-1 text-[11px] rounded text-left transition-all ${activePath === node.path ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"}`}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}>
      <FileIcon size={10} />
      <span className="truncate">{node.name}</span>
    </button>
  );
};

const ProjectViewer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [activeFile, setActiveFile] = useState<ParsedFile | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [tab, setTab] = useState<"code" | "preview">("code");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [participants, setParticipants] = useState<Record<string, { name: string; color: string; file?: string }>>({});
  const [apkStatus, setApkStatus] = useState<{ status: string; apk_url?: string } | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
      if (error || !data) { toast.error("Project not found"); navigate("/projects"); return; }
      setProject(data);
      const parsed = parseProjectFiles(data.code_content, `${data.name || "project"}.txt`);
      setFiles(parsed);
      if (parsed[0]) { setActiveFile(parsed[0]); setEditedContent(parsed[0].content); }
      // increment views (best-effort)
      await supabase.from("projects").update({ views: (data.views || 0) + 1 }).eq("id", id);
      setLoading(false);
    })();
  }, [id, navigate]);

  useEffect(() => {
    if (!id || !user) return;
    const channel = supabase.channel(`project:${id}`, { config: { presence: { key: user.id } } });
    channelRef.current = channel;
    const me = { name: profile?.display_name || user.email || "Anon", color: colorFor(user.id) };
    channel
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "projects", filter: `id=eq.${id}` }, (payload: any) => {
        const next = payload.new;
        if (!next || next.user_id === user.id) return;
        setProject(next);
        const parsed = parseProjectFiles(next.code_content, `${next.name || "project"}.txt`);
        setFiles(parsed);
        toast.info("Project updated by collaborator");
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as Record<string, any[]>;
        const map: typeof participants = {};
        Object.entries(state).forEach(([uid, metas]) => {
          if (uid === user.id) return;
          const m: any = metas[metas.length - 1];
          map[uid] = { name: m.name, color: m.color, file: m.file };
        });
        setParticipants(map);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await channel.track({ ...me, file: activeFile?.path });
      });
    return () => { supabase.removeChannel(channel); channelRef.current = null; };
    // eslint-disable-next-line
  }, [id, user?.id]);

  useEffect(() => {
    if (!channelRef.current || !user) return;
    channelRef.current.track({
      name: profile?.display_name || user.email || "Anon",
      color: colorFor(user.id),
      file: activeFile?.path,
    });
  }, [activeFile?.path, user?.id, profile?.display_name]);

  useEffect(() => {
    if (!apkStatus || apkStatus.status !== "pending" || !id || !user) return;
    const i = setInterval(async () => {
      const { data } = await supabase.from("apk_builds")
        .select("status, apk_url").eq("project_id", id).eq("user_id", user.id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (data) setApkStatus({ status: data.status, apk_url: data.apk_url || undefined });
    }, 5000);
    return () => clearInterval(i);
  }, [apkStatus?.status, id, user?.id]);

  const tree = useMemo(() => buildTree(files), [files]);
  const isWeb = useMemo(() => isWebProject(files), [files]);
  const previewSrc = useMemo(() => buildPreviewHTML(files, project?.name || "Preview"), [files, project]);

  const selectFile = (f: ParsedFile) => {
    if (activeFile && editedContent !== activeFile.content) {
      // auto-stash edits to in-memory file
      setFiles(prev => prev.map(x => x.path === activeFile.path ? { ...x, content: editedContent } : x));
    }
    setActiveFile(f);
    setEditedContent(f.content);
  };

  const saveAll = async () => {
    if (!project || !user) return;
    if (project.user_id !== user.id) { toast.error("You can only edit your own projects"); return; }
    setSaving(true);
    const updated = files.map(x => x.path === activeFile?.path ? { ...x, content: editedContent } : x);
    const code_content = serializeProjectFiles(updated);
    const { error } = await supabase.from("projects").update({ code_content }).eq("id", project.id);
    if (error) toast.error("Save failed");
    else { setFiles(updated); toast.success("Project saved"); }
    setSaving(false);
  };

  const requestApk = async () => {
    if (!user || !id) return;
    const { data, error } = await supabase.functions.invoke("project-export", { body: { projectId: id, format: "apk" } });
    if (error) { toast.error(error.message); return; }
    setApkStatus({ status: data.status });
    toast.success(data.message || "APK build queued");
  };

  const addFile = () => {
    const path = prompt("New file path (e.g. src/utils/helpers.ts):");
    if (!path) return;
    if (files.find(f => f.path === path)) { toast.error("File already exists"); return; }
    const f: ParsedFile = { path, content: "" };
    setFiles(prev => [...prev, f]);
    setActiveFile(f);
    setEditedContent("");
  };

  const deleteFile = () => {
    if (!activeFile) return;
    if (!confirm(`Delete ${activeFile.path}?`)) return;
    const next = files.filter(f => f.path !== activeFile.path);
    setFiles(next);
    setActiveFile(next[0] || null);
    setEditedContent(next[0]?.content || "");
  };

  if (loading) {
    return <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">Loading project…</div>;
  }
  if (!project) return null;

  const isOwner = user?.id === project.user_id;

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="border-b border-border/50 glass-ultra px-3 py-2 flex items-center gap-2 flex-wrap">
        <motion.button whileHover={{ x: -2 }} onClick={() => navigate("/projects")}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60 btn-hover">
          <ArrowLeft size={12} /> Back
        </motion.button>
        <div className="flex items-center gap-2 min-w-0">
          <FolderTree size={14} className="text-primary flex-shrink-0" />
          <p className="text-sm font-medium text-foreground truncate">{project.name}</p>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{project.language}</span>
          {project.is_published && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary">Published</span>}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {Object.keys(participants).length > 0 && (
            <div className="flex items-center -space-x-1.5 mr-1" title="Live collaborators">
              {Object.entries(participants).slice(0, 4).map(([uid, p]) => (
                <div key={uid} title={`${p.name}${p.file ? ` · ${p.file}` : ""}`}
                  className="w-6 h-6 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-semibold text-white"
                  style={{ background: p.color }}>
                  {(p.name || "?").charAt(0).toUpperCase()}
                </div>
              ))}
              {Object.keys(participants).length > 4 && (
                <div className="w-6 h-6 rounded-full border-2 border-background bg-secondary text-[9px] flex items-center justify-center">+{Object.keys(participants).length - 4}</div>
              )}
            </div>
          )}
          <div className="flex items-center bg-secondary/60 rounded-lg p-0.5">
            <button onClick={() => setTab("code")}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all ${tab === "code" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <Code size={11} /> Code
            </button>
            <button onClick={() => setTab("preview")}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all ${tab === "preview" ? "bg-accent/20 text-accent" : "text-muted-foreground hover:text-foreground"}`}>
              {isWeb ? <Globe size={11} /> : <Eye size={11} />} {isWeb ? "Live" : "Preview"}
            </button>
          </div>
          {isOwner && (
            <motion.button whileHover={{ scale: 1.05 }} onClick={saveAll} disabled={saving}
              className="flex items-center gap-1 bg-primary text-primary-foreground px-2.5 py-1 rounded-lg text-[11px] font-medium btn-hover disabled:opacity-50">
              <Save size={11} /> {saving ? "Saving…" : "Save"}
            </motion.button>
          )}
          <motion.button whileHover={{ scale: 1.05 }} onClick={() => downloadProjectAsZip(project.name, files)}
            className="flex items-center gap-1 bg-secondary text-foreground px-2.5 py-1 rounded-lg text-[11px] font-medium btn-hover">
            <Download size={11} /> ZIP
          </motion.button>
          {isOwner && (
            apkStatus?.apk_url ? (
              <a href={apkStatus.apk_url} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 bg-green-500/20 text-green-400 px-2.5 py-1 rounded-lg text-[11px] font-medium">
                <Smartphone size={11} /> Download APK
              </a>
            ) : (
              <button onClick={requestApk} disabled={apkStatus?.status === "pending"}
                className="flex items-center gap-1 bg-accent/20 text-accent px-2.5 py-1 rounded-lg text-[11px] font-medium disabled:opacity-60">
                <Smartphone size={11} /> {apkStatus?.status === "pending" ? "Building…" : "Build APK"}
              </button>
            )
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar tree */}
        <aside className="w-56 border-r border-border/50 glass-strong flex flex-col">
          <div className="flex items-center justify-between p-2 border-b border-border/50">
            <p className="text-[11px] font-medium text-foreground">Files ({files.length})</p>
            {isOwner && (
              <button onClick={addFile} title="New file" className="text-muted-foreground hover:text-primary">
                <Plus size={12} />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {tree.children.length === 0 ? (
              <p className="text-[10px] text-muted-foreground p-3 text-center">No files yet.</p>
            ) : (
              tree.children.map(c => <TreeRow key={c.path} node={c} depth={0} activePath={activeFile?.path || ""} onSelect={selectFile} />)
            )}
          </div>
          {project.description && (
            <div className="p-2 border-t border-border/50">
              <p className="text-[10px] text-muted-foreground line-clamp-3">{project.description}</p>
            </div>
          )}
        </aside>

        {/* Main */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {tab === "code" ? (
            activeFile ? (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/50 bg-secondary/30">
                  <FileCode size={12} className="text-primary" />
                  <span className="text-xs text-foreground font-medium truncate">{activeFile.path}</span>
                  {isOwner && (
                    <button onClick={deleteFile} className="ml-auto p-1 rounded hover:bg-destructive/10 text-destructive" title="Delete file">
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
                {isOwner ? (
                  <textarea value={editedContent} onChange={e => setEditedContent(e.target.value)}
                    spellCheck={false}
                    className="flex-1 w-full bg-background/60 text-foreground font-mono text-xs p-3 focus:outline-none resize-none" />
                ) : (
                  <pre className="flex-1 overflow-auto p-3 text-xs font-mono text-foreground bg-background/50 whitespace-pre-wrap">{activeFile.content}</pre>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">No file selected</div>
            )
          ) : (
            <iframe srcDoc={previewSrc} title="Preview" className="flex-1 w-full bg-white" sandbox="allow-scripts allow-same-origin" />
          )}
        </main>
      </div>
    </div>
  );
};

export default ProjectViewer;
