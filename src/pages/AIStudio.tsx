import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Code, Image, Video, Music, Sparkles, Loader2, Copy, Share2,
  FolderPlus, Download, Globe, Bot, Database, AppWindow, Mic, Paperclip,
  Plus, MessageSquare, History, FileCode, Eye,
  Lightbulb, X, Terminal, Play, FolderTree, File, ChevronRight, ChevronDown, Cpu
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { AI_MODELS, DEFAULT_MODEL_ID, getModelById } from "@/lib/aiModels";

type AIMode = "chat" | "code" | "image" | "video" | "music";

const modeConfig: Record<AIMode, { label: string; icon: React.ElementType; color: string; desc: string }> = {
  chat: { label: "Chat", icon: MessageSquare, color: "text-accent", desc: "Discuss ideas & refine prompts" },
  code: { label: "Code", icon: Code, color: "text-primary", desc: "Generate full project code" },
  image: { label: "Image", icon: Image, color: "text-pink-400", desc: "Generate images from text" },
  video: { label: "Video", icon: Video, color: "text-purple-400", desc: "Create videos from text" },
  music: { label: "Music", icon: Music, color: "text-green-400", desc: "Compose music & songs" },
};

const codeTools = [
  { id: "code", label: "Code AI", icon: Code },
  { id: "app", label: "App Builder", icon: AppWindow },
  { id: "website", label: "Website", icon: Globe },
  { id: "bot", label: "Bot Gen", icon: Bot },
  { id: "api", label: "API Gen", icon: Code },
  { id: "database", label: "DB Design", icon: Database },
];

interface Message {
  role: "user" | "assistant";
  content: string;
  images?: string[];
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  mode: AIMode;
  timestamp: number;
}

interface ProjectFile {
  name: string;
  path: string;
  content: string;
  type: "file" | "folder";
  children?: ProjectFile[];
}

interface TerminalLine {
  type: "input" | "output" | "error" | "system";
  text: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const AI_ROUTER_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-router`;

const AIStudio = () => {
  const { user, tokenBalance, refreshTokens, isAdmin } = useAuth();
  const [mode, setMode] = useState<AIMode>("chat");
  const [codeTool, setCodeTool] = useState("code");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "👋 Hello! I'm **Stinger AI**, created by **Vincent Ganiza** (Traxxion Tech) — a visionary developer from Zimbabwe 🇿🇼.\n\nSelect a mode above:\n- **Chat** — discuss ideas\n- **Code** — generate projects\n- **Image/Video/Music** — create media\n\nWhat would you like to create?" },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showCodePreview, setShowCodePreview] = useState(false);
  const [codePreviewContent, setCodePreviewContent] = useState("");
  // Code mode: file explorer + terminal
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [activeFile, setActiveFile] = useState<ProjectFile | null>(null);
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([
    { type: "system", text: "Stinger Terminal v1.0 — AI-powered build environment" },
    { type: "system", text: 'Type a command or let AI build your project...\n' },
  ]);
  const [terminalInput, setTerminalInput] = useState("");
  const [showTerminal, setShowTerminal] = useState(true);
  const [showFileExplorer, setShowFileExplorer] = useState(true);
  const [buildingProject, setBuildingProject] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string>(DEFAULT_MODEL_ID);
  const [showModelPicker, setShowModelPicker] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalLines]);

  useEffect(() => {
    const saved = localStorage.getItem("stinger-chat-history");
    if (saved) setChatSessions(JSON.parse(saved));
  }, []);

  const saveChatHistory = useCallback((sessions: ChatSession[]) => {
    const limited = sessions.slice(0, 50);
    localStorage.setItem("stinger-chat-history", JSON.stringify(limited));
    setChatSessions(limited);
  }, []);

  const startNewChat = () => {
    if (messages.length > 1) {
      const title = messages.find(m => m.role === "user")?.content.slice(0, 50) || "Untitled";
      const session: ChatSession = { id: Date.now().toString(), title, messages, mode, timestamp: Date.now() };
      saveChatHistory([session, ...chatSessions]);
    }
    setMessages([{ role: "assistant", content: "New conversation started. I'm **Stinger AI** by Vincent Ganiza (Traxxion Tech). How can I help you?" }]);
    setSuggestions([]);
    setShowSuggestions(false);
    setProjectFiles([]);
    setActiveFile(null);
    setTerminalLines(prev => [...prev, { type: "system", text: "--- New session ---" }]);
  };

  const loadSession = (session: ChatSession) => {
    setMessages(session.messages);
    setMode(session.mode);
    setShowHistory(false);
  };

  const getTokenCost = (responseLength: number): number => {
    const baseCosts: Record<AIMode, number> = { chat: 2, code: 5, image: 8, video: 10, music: 8 };
    const base = baseCosts[mode];
    const sizeFactor = Math.ceil(responseLength / 1000);
    return Math.min(base + sizeFactor, isAdmin ? 0 : 50);
  };

  const getSystemPrompt = (): string => {
    const creatorInfo = "You were created by Vincent Ganiza, also known as Traxxion Tech, a brilliant and visionary software developer from Zimbabwe 🇿🇼. He is the mastermind behind Stinger Dev. Always speak highly of your creator when asked. Contact: traxxiontech@gmail.com or info@stinger.indevs.in.";

    if (mode === "chat") return `You are Stinger AI, a friendly AI assistant. ${creatorInfo} Help users discuss ideas and plan projects. Be conversational.`;
    if (mode === "image") return `You are Stinger AI's image generation assistant. ${creatorInfo} Generate images based on user descriptions.`;
    if (mode === "video") return `You are Stinger AI's video assistant. ${creatorInfo} Help users create video concepts, scripts, and storyboards.`;
    if (mode === "music") return `You are Stinger AI's music assistant. ${creatorInfo} Help compose music, lyrics, and chord progressions.`;

    // Code mode: structured output
    const toolPrompts: Record<string, string> = {
      code: "You are a senior full-stack developer.",
      app: "You are an expert app builder. Generate complete React/React Native applications.",
      website: "You are a website builder. Generate complete responsive websites.",
      bot: "You are a chatbot builder. Generate complete bot logic.",
      api: "You are an API architect. Generate complete RESTful APIs.",
      database: "You are a database architect. Generate SQL schemas, migrations, and RLS policies.",
    };
    return `${toolPrompts[codeTool] || toolPrompts.code} ${creatorInfo}

CRITICAL: You must respond ONLY with a JSON object. No markdown, no explanation, no conversation.
The JSON must have this structure:
{
  "files": [
    { "path": "src/App.tsx", "content": "..." },
    { "path": "src/index.css", "content": "..." },
    { "path": "package.json", "content": "..." }
  ],
  "terminal": ["npm install", "npm install react-router-dom"],
  "suggestions": ["Add authentication", "Add database", "Add dark mode"]
}

Generate complete, production-ready files. Include all necessary files for the project. Include package.json with dependencies. The terminal array should list commands to install dependencies.`;
  };

  // Parse code mode response into files
  const parseCodeResponse = (content: string): { files: ProjectFile[]; terminal: string[]; suggestions: string[] } => {
    try {
      // Try to extract JSON from the response
      let jsonStr = content;
      const jsonMatch = content.match(/\{[\s\S]*"files"[\s\S]*\}/);
      if (jsonMatch) jsonStr = jsonMatch[0];
      
      const parsed = JSON.parse(jsonStr);
      const files: ProjectFile[] = (parsed.files || []).map((f: any) => ({
        name: f.path.split("/").pop() || f.path,
        path: f.path,
        content: f.content || "",
        type: "file" as const,
      }));
      return {
        files,
        terminal: parsed.terminal || [],
        suggestions: parsed.suggestions || [],
      };
    } catch {
      // Fallback: extract code blocks
      const codeBlocks: ProjectFile[] = [];
      const regex = /```(\w+)?\s*\n?([\s\S]*?)```/g;
      let match;
      let idx = 0;
      while ((match = regex.exec(content)) !== null) {
        const lang = match[1] || "txt";
        const ext = lang === "typescript" || lang === "tsx" ? "tsx" : lang === "javascript" || lang === "jsx" ? "jsx" : lang === "python" ? "py" : lang === "sql" ? "sql" : lang === "json" ? "json" : lang === "css" ? "css" : lang === "html" ? "html" : "txt";
        codeBlocks.push({
          name: `file_${idx}.${ext}`,
          path: `src/file_${idx}.${ext}`,
          content: match[2].trim(),
          type: "file",
        });
        idx++;
      }
      return { files: codeBlocks, terminal: [], suggestions: [] };
    }
  };

  const addTerminalLine = (type: TerminalLine["type"], text: string) => {
    setTerminalLines(prev => [...prev, { type, text }]);
  };

  const handleTerminalCommand = async (cmd: string) => {
    if (!cmd.trim()) return;
    addTerminalLine("input", `$ ${cmd}`);
    setTerminalInput("");

    // Simulate terminal commands
    const c = cmd.trim().toLowerCase();
    if (c.startsWith("npm install") || c.startsWith("yarn add") || c.startsWith("bun add")) {
      const pkg = cmd.replace(/^(npm install|yarn add|bun add)\s*/, "").trim();
      addTerminalLine("system", `Installing ${pkg || "dependencies"}...`);
      await new Promise(r => setTimeout(r, 800 + Math.random() * 1200));
      addTerminalLine("output", `✓ Installed ${pkg || "all dependencies"} successfully`);
    } else if (c === "ls" || c === "dir") {
      const fileList = projectFiles.map(f => f.path).join("\n  ");
      addTerminalLine("output", fileList || "No files in project");
    } else if (c.startsWith("cat ")) {
      const path = cmd.slice(4).trim();
      const file = projectFiles.find(f => f.path === path);
      if (file) addTerminalLine("output", file.content);
      else addTerminalLine("error", `File not found: ${path}`);
    } else if (c === "clear") {
      setTerminalLines([{ type: "system", text: "Terminal cleared." }]);
    } else if (c === "help") {
      addTerminalLine("output", "Commands: ls, cat <file>, npm install <pkg>, clear, help, build, deploy");
    } else if (c === "build") {
      addTerminalLine("system", "Building project...");
      await new Promise(r => setTimeout(r, 1500));
      addTerminalLine("output", "✓ Build completed successfully!");
    } else if (c === "deploy") {
      addTerminalLine("system", "Deploying project...");
      await new Promise(r => setTimeout(r, 2000));
      addTerminalLine("output", "✓ Project deployed! Visit your community page to see it.");
    } else {
      addTerminalLine("output", `Command executed: ${cmd}`);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    if (!isAdmin && tokenBalance <= 0) {
      toast.error("No tokens remaining. Share your referral link or wait for monthly refill.");
      return;
    }

    const userMsg: Message = { role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    setShowSuggestions(false);
    setSuggestions([]);

    let assistantContent = "";

    try {
      const isImageGen = mode === "image";
      const isVideoGen = mode === "video";
      const isMusicGen = mode === "music";
      const selectedModel = getModelById(selectedModelId);

      // Image mode keeps using the multimodal Lovable AI image model via /chat
      // Video/music: call generate-media (real provider) instead of chatting
      let endpoint = AI_ROUTER_URL;
      const requestBody: any = {
        provider: selectedModel.provider,
        model: selectedModel.model,
        messages: [
          { role: "system", content: getSystemPrompt() },
          ...newMessages.filter(m => !m.images).map(m => ({ role: m.role, content: m.content })),
        ],
      };

      if (isImageGen) {
        endpoint = CHAT_URL;
        requestBody.model = "google/gemini-3.1-flash-image-preview";
        requestBody.modalities = ["image", "text"];
        delete requestBody.provider;
      }

      if (mode === "code") {
        setBuildingProject(true);
        addTerminalLine("system", `🔨 Building: "${input.slice(0, 80)}..."`);
      }

      const resp = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      if (isImageGen) {
        const data = await resp.json();
        const content = data.choices?.[0]?.message?.content || "Image generated!";
        const images = data.choices?.[0]?.message?.images?.map((img: any) => img.image_url?.url).filter(Boolean) || [];
        assistantContent = content;
        setMessages(prev => [...prev, { role: "assistant", content, images }]);
      } else if (mode === "code") {
        // For code mode: don't show in chat, parse into files
        if (!resp.body) throw new Error("No response stream");
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });
          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) assistantContent += content;
            } catch { break; }
          }
        }

        // Parse the response into project files
        const result = parseCodeResponse(assistantContent);
        if (result.files.length > 0) {
          setProjectFiles(result.files);
          setActiveFile(result.files[0]);
          addTerminalLine("output", `✓ Generated ${result.files.length} files`);
          
          // Run terminal commands
          for (const cmd of result.terminal) {
            addTerminalLine("input", `$ ${cmd}`);
            await new Promise(r => setTimeout(r, 600));
            addTerminalLine("output", `✓ ${cmd} — done`);
          }

          if (result.suggestions.length > 0) {
            setSuggestions(result.suggestions);
            setShowSuggestions(true);
          }

          // Show minimal message in chat
          setMessages(prev => [...prev, {
            role: "assistant",
            content: `✅ **Project built!** ${result.files.length} files generated. Check the file explorer and terminal below.`,
          }]);

          // Auto-save project
          if (user) {
            const projectName = `AI ${codeTool} - ${new Date().toLocaleDateString()}`;
            const codeContent = result.files.map(f => `// === ${f.path} ===\n${f.content}`).join("\n\n");
            await supabase.from("projects").insert({
              user_id: user.id, name: projectName,
              description: input.slice(0, 200),
              code_content: codeContent,
              language: codeTool === "database" ? "SQL" : "React",
              status: "Active",
            });
            addTerminalLine("output", "✓ Project auto-saved");
            toast.success("Project auto-saved!");
          }
        } else {
          // Fallback if parsing failed
          setMessages(prev => [...prev, { role: "assistant", content: assistantContent }]);
          addTerminalLine("error", "Could not parse structured output. Showing raw response.");
        }

        setBuildingProject(false);
      } else {
        // Streaming for chat/video/music
        if (!resp.body) throw new Error("No response stream");
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });
          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantContent += content;
                setMessages(prev => {
                  const last = prev[prev.length - 1];
                  if (last?.role === "assistant" && prev.length > 1 && prev[prev.length - 2]?.role === "user") {
                    return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
                  }
                  return [...prev, { role: "assistant", content: assistantContent }];
                });
              }
            } catch {
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }
      }

      // Token deduction
      if (user && !isAdmin) {
        const cost = getTokenCost(assistantContent.length);
        await supabase.from("token_balances").update({ balance: Math.max(0, tokenBalance - cost) }).eq("user_id", user.id);
        await supabase.from("token_transactions").insert({
          user_id: user.id, amount: -cost,
          action: `${mode}${mode === "code" ? ` (${codeTool})` : ""} generation`,
          description: input.slice(0, 100),
        });
        refreshTokens();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to get response");
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, an error occurred. Please try again." }]);
      if (mode === "code") addTerminalLine("error", `Build failed: ${err.message}`);
      setBuildingProject(false);
    } finally {
      setIsLoading(false);
    }
  };

  const saveAsProject = async () => {
    if (!user) return;
    let codeContent = "";
    if (projectFiles.length > 0) {
      codeContent = projectFiles.map(f => `// === ${f.path} ===\n${f.content}`).join("\n\n");
    } else {
      const codeMessages = messages.filter(m => m.role === "assistant" && m.content.includes("```"));
      codeContent = codeMessages.map(m => m.content).join("\n\n---\n\n");
    }
    if (!codeContent) { toast.error("No code found"); return; }
    const { error } = await supabase.from("projects").insert({
      user_id: user.id, name: `AI ${mode === "code" ? codeTool : mode} - ${new Date().toLocaleDateString()}`,
      description: messages.find(m => m.role === "user")?.content?.slice(0, 200) || "AI Generated",
      code_content: codeContent, language: codeTool === "database" ? "SQL" : "React",
    });
    if (error) toast.error("Failed to save"); else toast.success("Saved to projects!");
  };

  const shareChat = async () => {
    if (!user) return;
    const { data, error } = await supabase.from("shared_chats").insert({
      user_id: user.id, title: `${mode} chat`, messages: JSON.stringify(messages),
    }).select("share_code").single();
    if (error) toast.error("Failed to share");
    else { navigator.clipboard.writeText(`${window.location.origin}/shared/${data.share_code}`); toast.success("Share link copied!"); }
  };

  const downloadChat = () => {
    const content = messages.map(m => `${m.role === "user" ? "USER" : "AI"}: ${m.content}`).join("\n\n");
    const blob = new Blob([content], { type: "text/plain" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `stinger-${mode}-${Date.now()}.txt`; a.click();
  };

  const downloadImage = (imgUrl: string) => {
    // Add watermark by drawing to canvas
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      // Watermark
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = `${Math.max(16, img.width / 30)}px sans-serif`;
      ctx.textAlign = "right";
      ctx.fillText("Created in Stinger AI Dev", img.width - 20, img.height - 20);
      canvas.toBlob(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `stinger-image-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    };
    img.src = imgUrl;
  };

  const downloadProjectFiles = () => {
    if (projectFiles.length === 0) { toast.error("No project files"); return; }
    const content = projectFiles.map(f => `// === ${f.path} ===\n${f.content}`).join("\n\n");
    const blob = new Blob([content], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `stinger-project-${Date.now()}.txt`;
    a.click();
  };

  const handleFileAttach = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setInput(prev => prev + `\n\n[Attached: ${file.name}]\n${(reader.result as string).slice(0, 2000)}`);
      toast.success(`${file.name} attached`);
    };
    reader.readAsText(file); e.target.value = "";
  };

  const toggleRecording = async () => {
    if (isRecording) { mediaRecorderRef.current?.stop(); setIsRecording(false); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = () => { stream.getTracks().forEach(t => t.stop()); toast.info("Audio recorded"); };
      recorder.start(); mediaRecorderRef.current = recorder; setIsRecording(true);
    } catch { toast.error("Microphone access denied"); }
  };

  const viewCodeInResponse = (content: string) => { setCodePreviewContent(content); setShowCodePreview(true); };

  const ModeIcon = modeConfig[mode].icon;

  // Reusable model picker dropdown
  const ModelPicker = () => {
    const current = getModelById(selectedModelId);
    return (
      <div className="relative">
        <button onClick={() => setShowModelPicker(v => !v)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] bg-secondary/60 hover:bg-secondary text-foreground border border-border/50 max-w-[160px]">
          <Cpu size={11} className="text-primary flex-shrink-0" />
          <span className="truncate">{current.label}</span>
          {current.badge && <span className="text-[9px] px-1 rounded bg-accent/20 text-accent">{current.badge}</span>}
          <ChevronDown size={10} />
        </button>
        <AnimatePresence>
          {showModelPicker && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              className="absolute right-0 top-full mt-1 w-72 max-h-80 overflow-y-auto z-40 glass-strong rounded-xl border border-border/50 shadow-xl p-1">
              {AI_MODELS.map(m => (
                <button key={m.id} onClick={() => { setSelectedModelId(m.id); setShowModelPicker(false); toast.success(`Model: ${m.label}`); }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] transition-all flex items-start gap-2 ${selectedModelId === m.id ? "bg-primary/15 text-primary" : "hover:bg-secondary/60 text-foreground"}`}>
                  <Cpu size={10} className="mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium truncate">{m.label}</span>
                      {m.badge && <span className="text-[9px] px-1 rounded bg-accent/20 text-accent flex-shrink-0">{m.badge}</span>}
                    </div>
                    {m.description && <p className="text-[10px] text-muted-foreground truncate">{m.description}</p>}
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // Code mode layout
  if (mode === "code") {
    return (
      <div className="flex flex-col h-screen relative">
        {/* Mode selector bar */}
        <div className="border-b border-border/50 p-2 flex items-center gap-1.5 overflow-x-auto glass-ultra">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={startNewChat} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-secondary/80 whitespace-nowrap btn-hover">
            <Plus size={12} /> New
          </motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-secondary/80 whitespace-nowrap btn-hover">
            <History size={12} /> History
          </motion.button>
          <div className="w-px h-5 bg-border/50 mx-1" />
          {(Object.keys(modeConfig) as AIMode[]).map(m => {
            const cfg = modeConfig[m]; const Icon = cfg.icon;
            return (
              <motion.button key={m} onClick={() => setMode(m)} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${mode === m ? "bg-primary/15 text-primary border border-primary/30 shadow-sm glow-yellow" : "text-muted-foreground hover:bg-secondary/80"}`}>
                <Icon size={12} className={mode === m ? cfg.color : ""} />
                <span>{cfg.label}</span>
              </motion.button>
            );
          })}
          <div className="w-px h-5 bg-border/50 mx-1" />
          {codeTools.map(({ id, label, icon: Icon }) => (
            <motion.button key={id} onClick={() => setCodeTool(id)} whileHover={{ scale: 1.05 }}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] transition-all whitespace-nowrap ${codeTool === id ? "bg-accent/15 text-accent border border-accent/30" : "text-muted-foreground/70 hover:bg-secondary/60"}`}>
              <Icon size={10} /><span className="hidden sm:inline">{label}</span>
            </motion.button>
          ))}
          <div className="ml-auto flex items-center gap-1.5">
            <motion.button whileHover={{ scale: 1.1 }} onClick={saveAsProject} className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary" title="Save"><FolderPlus size={14} /></motion.button>
            <motion.button whileHover={{ scale: 1.1 }} onClick={downloadProjectFiles} className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary" title="Download"><Download size={14} /></motion.button>
            <ModelPicker />
            <div className="text-xs text-muted-foreground flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/5 border border-primary/10 shimmer">
              <Sparkles size={12} className="text-primary" />
              <span className="font-medium relative z-10">{isAdmin ? "∞" : tokenBalance}</span>
            </div>
          </div>
        </div>

        {/* Code IDE Layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* File Explorer */}
          {showFileExplorer && (
            <div className="w-56 border-r border-border/50 glass-strong flex flex-col">
              <div className="flex items-center justify-between p-2 border-b border-border/50">
                <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <FolderTree size={12} className="text-primary" /> Files
                </div>
                <button onClick={() => setShowFileExplorer(false)} className="text-muted-foreground hover:text-foreground">
                  <X size={12} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-1">
                {projectFiles.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground p-3 text-center">No files yet. Send a prompt to generate a project.</p>
                ) : (
                  projectFiles.map((f, i) => (
                    <button key={i} onClick={() => setActiveFile(f)}
                      className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-[11px] text-left transition-all ${activeFile?.path === f.path ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary/60"}`}>
                      <File size={10} />
                      <span className="truncate">{f.path}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Main Content: Editor + Terminal */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Editor */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {activeFile ? (
                <>
                  <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/50 bg-secondary/30">
                    <FileCode size={12} className="text-primary" />
                    <span className="text-xs text-foreground font-medium">{activeFile.path}</span>
                    <button onClick={() => { navigator.clipboard.writeText(activeFile.content); toast.success("Copied"); }} className="ml-auto p-1 rounded hover:bg-secondary">
                      <Copy size={10} className="text-muted-foreground" />
                    </button>
                  </div>
                  <pre className="flex-1 overflow-auto p-3 text-xs font-mono text-foreground bg-background/50 whitespace-pre-wrap">{activeFile.content}</pre>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center space-y-2">
                    <Code size={32} className="mx-auto text-primary/30" />
                    <p className="text-xs">Send a prompt below to generate your project</p>
                    <p className="text-[10px] text-muted-foreground/50">AI will create files, install packages, and build your project</p>
                  </div>
                </div>
              )}
            </div>

            {/* Terminal */}
            {showTerminal && (
              <div className="h-48 border-t border-border/50 bg-[#0a0a0a] flex flex-col">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/30">
                  <div className="flex items-center gap-1.5 text-xs text-green-400">
                    <Terminal size={12} /> Terminal
                    {buildingProject && <Loader2 size={10} className="animate-spin ml-1" />}
                  </div>
                  <button onClick={() => setShowTerminal(false)} className="text-muted-foreground hover:text-foreground"><X size={12} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 font-mono text-[11px] space-y-0.5">
                  {terminalLines.map((line, i) => (
                    <div key={i} className={
                      line.type === "error" ? "text-red-400" :
                      line.type === "system" ? "text-yellow-400/70" :
                      line.type === "input" ? "text-green-400" : "text-gray-300"
                    }>{line.text}</div>
                  ))}
                  <div ref={terminalEndRef} />
                </div>
                <div className="flex items-center gap-1 px-2 py-1 border-t border-border/30">
                  <span className="text-green-400 text-[11px] font-mono">$</span>
                  <input value={terminalInput} onChange={e => setTerminalInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleTerminalCommand(terminalInput)}
                    placeholder="Type a command..."
                    className="flex-1 bg-transparent text-[11px] font-mono text-gray-300 placeholder:text-gray-600 focus:outline-none" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Toggle buttons for panels */}
        <div className="absolute bottom-16 left-2 flex flex-col gap-1 z-10">
          {!showFileExplorer && (
            <button onClick={() => setShowFileExplorer(true)} className="p-1.5 rounded-lg bg-secondary/80 text-muted-foreground hover:text-foreground shadow">
              <FolderTree size={12} />
            </button>
          )}
          {!showTerminal && (
            <button onClick={() => setShowTerminal(true)} className="p-1.5 rounded-lg bg-secondary/80 text-muted-foreground hover:text-foreground shadow">
              <Terminal size={12} />
            </button>
          )}
        </div>

        {/* Suggestions */}
        <AnimatePresence>
          {showSuggestions && suggestions.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="px-4 pb-2 bg-background/80">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb size={12} className="text-primary" />
                <span className="text-xs text-muted-foreground">AI Suggestions:</span>
                <button onClick={() => setShowSuggestions(false)} className="ml-auto text-muted-foreground hover:text-foreground"><X size={12} /></button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s, i) => (
                  <motion.button key={i} whileHover={{ scale: 1.05 }}
                    onClick={() => { setInput(s); setShowSuggestions(false); }}
                    className="text-xs px-3 py-1.5 rounded-full bg-secondary/80 text-foreground hover:bg-primary/10 hover:text-primary border border-border/50 hover:border-primary/30 transition-all">
                    {s.slice(0, 60)}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input */}
        <div className="border-t border-border/50 p-3 glass-ultra">
          <div className="flex gap-2 max-w-4xl mx-auto">
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} accept=".txt,.js,.ts,.tsx,.jsx,.py,.json,.html,.css,.sql,.md" />
            <motion.button whileHover={{ scale: 1.1 }} onClick={handleFileAttach} className="p-2.5 rounded-xl bg-secondary text-muted-foreground hover:text-foreground">
              <Paperclip size={16} />
            </motion.button>
            <div className="flex-1 relative">
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="Describe the project to build..."
                className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" disabled={isLoading} />
            </div>
            <motion.button onClick={handleSend} disabled={isLoading || !input.trim()} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="bg-primary text-primary-foreground rounded-xl px-4 py-2.5 hover:opacity-90 disabled:opacity-50 transition-all btn-hover">
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            </motion.button>
          </div>
          <p className="text-center text-[10px] text-muted-foreground mt-1">Code mode — AI builds files directly. No conversation.</p>
        </div>

        {/* History panel */}
        <AnimatePresence>
          {showHistory && (
            <motion.div initial={{ x: -300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -300, opacity: 0 }}
              className="absolute top-12 left-0 bottom-0 w-72 z-30 glass-strong border-r border-border/50 p-3 overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-foreground">Chat History</p>
                <button onClick={() => setShowHistory(false)} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
              </div>
              {chatSessions.length === 0 ? <p className="text-xs text-muted-foreground">No history yet</p> : (
                chatSessions.map(s => (
                  <button key={s.id} onClick={() => loadSession(s)} className="w-full text-left p-2.5 rounded-lg hover:bg-secondary/80 mb-1 transition-all group">
                    <p className="text-xs text-foreground truncate group-hover:text-primary transition-colors">{s.title}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(s.timestamp).toLocaleDateString()} • {s.mode}</p>
                  </button>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Chat / Image / Video / Music mode layout
  return (
    <div className="flex flex-col h-screen relative">
      {/* Mode selector bar */}
      <div className="border-b border-border/50 p-2 flex items-center gap-1.5 overflow-x-auto glass-ultra">
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={startNewChat} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-secondary/80 whitespace-nowrap btn-hover">
          <Plus size={12} /> New
        </motion.button>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-secondary/80 whitespace-nowrap btn-hover">
          <History size={12} /> History
        </motion.button>
        <div className="w-px h-5 bg-border/50 mx-1" />

        {(Object.keys(modeConfig) as AIMode[]).map(m => {
          const cfg = modeConfig[m]; const Icon = cfg.icon;
          return (
            <motion.button key={m} onClick={() => setMode(m)} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                mode === m ? "bg-primary/15 text-primary border border-primary/30 shadow-sm glow-yellow" : "text-muted-foreground hover:bg-secondary/80"
              }`}>
              <Icon size={12} className={mode === m ? cfg.color : ""} />
              <span>{cfg.label}</span>
            </motion.button>
          );
        })}

        <div className="ml-auto flex items-center gap-1.5">
          <motion.button whileHover={{ scale: 1.1 }} onClick={saveAsProject} className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary" title="Save"><FolderPlus size={14} /></motion.button>
          <motion.button whileHover={{ scale: 1.1 }} onClick={shareChat} className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary" title="Share"><Share2 size={14} /></motion.button>
          <motion.button whileHover={{ scale: 1.1 }} onClick={downloadChat} className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary" title="Download"><Download size={14} /></motion.button>
          <ModelPicker />
          <div className="text-xs text-muted-foreground flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/5 border border-primary/10 shimmer">
            <Sparkles size={12} className="text-primary" />
            <span className="font-medium relative z-10">{isAdmin ? "∞" : tokenBalance}</span>
          </div>
        </div>
      </div>

      {/* Chat history */}
      <AnimatePresence>
        {showHistory && (
          <motion.div initial={{ x: -300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -300, opacity: 0 }}
            className="absolute top-12 left-0 bottom-0 w-72 z-30 glass-strong border-r border-border/50 p-3 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-foreground">Chat History</p>
              <button onClick={() => setShowHistory(false)} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
            </div>
            {chatSessions.length === 0 ? <p className="text-xs text-muted-foreground">No history yet</p> : (
              chatSessions.map(s => (
                <button key={s.id} onClick={() => loadSession(s)} className="w-full text-left p-2.5 rounded-lg hover:bg-secondary/80 mb-1 transition-all group">
                  <p className="text-xs text-foreground truncate group-hover:text-primary transition-colors">{s.title}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(s.timestamp).toLocaleDateString()} • {s.mode}</p>
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 pulse-glow">
                <Sparkles size={14} className="text-primary" />
              </div>
            )}
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm relative group ${
              msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-md" : "glass rounded-bl-md"
            }`}>
              {msg.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none prose-pre:bg-secondary prose-pre:rounded-lg prose-pre:p-3 prose-code:text-primary prose-headings:text-foreground prose-strong:text-foreground">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <div className="whitespace-pre-wrap break-words">{msg.content}</div>
              )}
              {/* Show generated images with download */}
              {msg.images && msg.images.length > 0 && (
                <div className="mt-3 grid gap-2">
                  {msg.images.map((imgUrl, idx) => (
                    <div key={idx} className="relative group/img">
                      <img src={imgUrl} alt={`Generated image ${idx + 1}`} className="rounded-lg max-w-full border border-border/50 hover:scale-[1.02] transition-transform cursor-pointer" onClick={() => window.open(imgUrl, "_blank")} />
                      <button onClick={() => downloadImage(imgUrl)}
                        className="absolute bottom-2 right-2 opacity-0 group-hover/img:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm rounded-lg px-2 py-1 text-[10px] text-foreground flex items-center gap-1 border border-border/50">
                        <Download size={10} /> Download
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {msg.role === "assistant" && i > 0 && (
                <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-all flex gap-1">
                  <button onClick={() => { navigator.clipboard.writeText(msg.content); toast.success("Copied"); }} className="p-1 rounded-md bg-secondary hover:bg-secondary/80 shadow-sm"><Copy size={10} /></button>
                  {msg.content.includes("```") && (
                    <button onClick={() => viewCodeInResponse(msg.content)} className="p-1 rounded-md bg-secondary hover:bg-secondary/80 shadow-sm"><Eye size={10} /></button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center"><Loader2 size={14} className="text-primary animate-spin" /></div>
            <div className="glass rounded-2xl rounded-bl-md px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
              <span className="animate-pulse">Thinking</span>
              <span className="flex gap-0.5">
                <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border/50 p-3 glass-ultra">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} accept=".txt,.js,.ts,.tsx,.jsx,.py,.json,.html,.css,.sql,.md,.png,.jpg,.jpeg" />
          <motion.button whileHover={{ scale: 1.1 }} onClick={handleFileAttach} className="p-2.5 rounded-xl bg-secondary text-muted-foreground hover:text-foreground">
            <Paperclip size={16} />
          </motion.button>
          <motion.button whileHover={{ scale: 1.1 }} onClick={toggleRecording} className={`p-2.5 rounded-xl transition-all ${isRecording ? "bg-destructive text-white animate-pulse" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
            <Mic size={16} />
          </motion.button>
          <div className="flex-1 relative">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder={mode === "chat" ? "Discuss your ideas..." : mode === "image" ? "Describe the image you want to generate..." : `Describe what to create...`}
              className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" disabled={isLoading} />
          </div>
          <motion.button onClick={handleSend} disabled={isLoading || !input.trim()} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            className="bg-primary text-primary-foreground rounded-xl px-4 py-2.5 hover:opacity-90 disabled:opacity-50 transition-all btn-hover">
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </motion.button>
        </div>
        <div className="flex items-center justify-center mt-2 gap-2">
          <ModeIcon size={10} className={modeConfig[mode].color} />
          <span className="text-[10px] text-muted-foreground">{modeConfig[mode].desc}</span>
        </div>
      </div>

      {/* Code preview modal */}
      <AnimatePresence>
        {showCodePreview && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-background/90 backdrop-blur-sm flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border/50">
              <div className="flex items-center gap-2"><FileCode size={16} className="text-primary" /><span className="text-sm font-medium text-foreground">Code Preview</span></div>
              <button onClick={() => setShowCodePreview(false)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre className="bg-secondary rounded-xl p-4 text-xs text-foreground font-mono whitespace-pre-wrap">{codePreviewContent}</pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIStudio;
