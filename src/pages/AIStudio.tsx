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
import { streamPuter, streamQvac, isClientProvider } from "@/lib/clientAI";
import ModelPickerDialog from "@/components/ModelPickerDialog";

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

const AI_ROUTER_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-router`;
const FN_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

interface Attachment { name: string; kind: "image" | "text" | "audio"; dataUrl?: string; text?: string }

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
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [transcribing, setTranscribing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const threadRef = useRef<string | null>(null);

  // Auto-grow the composer downwards (never sideways) with an internal scrollbar.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalLines]);

  // ---- Persistent chat history (database-backed, per user) ----
  const loadThreads = useCallback(async () => {
    if (!user) {
      const saved = localStorage.getItem("stinger-chat-history");
      if (saved) { try { setChatSessions(JSON.parse(saved)); } catch { /* ignore */ } }
      return;
    }
    const { data } = await supabase
      .from("chat_threads").select("id, title, mode, updated_at")
      .eq("user_id", user.id).order("updated_at", { ascending: false }).limit(50);
    if (data) {
      setChatSessions(data.map(t => ({
        id: t.id, title: t.title, mode: (t.mode as AIMode) || "chat",
        messages: [], timestamp: new Date(t.updated_at).getTime(),
      })));
    }
  }, [user]);

  useEffect(() => { loadThreads(); }, [loadThreads]);

  const ensureThread = async (firstMessage: string): Promise<string | null> => {
    if (!user) return null;
    if (threadRef.current) return threadRef.current;
    const { data } = await supabase.from("chat_threads")
      .insert({ user_id: user.id, title: firstMessage.slice(0, 60) || "New chat", mode })
      .select("id").single();
    threadRef.current = data?.id || null;
    return threadRef.current;
  };

  const persistMessage = async (role: "user" | "assistant", content: string) => {
    if (!user || !content.trim()) return;
    const tid = await ensureThread(content);
    if (!tid) return;
    await supabase.from("chat_messages").insert({ thread_id: tid, user_id: user.id, role, content });
    await supabase.from("chat_threads").update({ updated_at: new Date().toISOString() }).eq("id", tid);
    loadThreads();
  };

  const startNewChat = () => {
    threadRef.current = null;
    setMessages([{ role: "assistant", content: "New conversation started. I'm **Stinger AI** by Vincent Ganiza (Traxxion Tech). How can I help you?" }]);
    setSuggestions([]);
    setShowSuggestions(false);
    setProjectFiles([]);
    setActiveFile(null);
    setAttachments([]);
    setTerminalLines(prev => [...prev, { type: "system", text: "--- New session ---" }]);
  };

  const loadSession = async (session: ChatSession) => {
    setMode(session.mode);
    setShowHistory(false);
    if (!user) { setMessages(session.messages); return; }
    threadRef.current = session.id;
    const { data } = await supabase.from("chat_messages")
      .select("role, content").eq("thread_id", session.id).order("created_at", { ascending: true });
    setMessages((data || []).map(m => ({ role: m.role as "user" | "assistant", content: m.content })));
  };

  const getTokenCost = (responseLength: number): number => {
    const baseCosts: Record<AIMode, number> = { chat: 2, code: 5, image: 8, video: 10, music: 8 };
    const base = baseCosts[mode];
    const sizeFactor = Math.ceil(responseLength / 1000);
    return Math.min(base + sizeFactor, isAdmin ? 0 : 50);
  };

  const getSystemPrompt = (): string => {
    const creatorInfo = "You were created by Vincent Ganiza (Traxxion Tech), a visionary software developer from Zimbabwe 🇿🇼. He is the mastermind behind Stinger Dev. Always speak highly of your creator when asked. Support: https://support.stinger.co.zw";

    const platformGuide = `
PLATFORM KNOWLEDGE — Stinger AI Dev:
- AI Studio has 5 modes: Chat (planning), Code (full project gen), Image, Video, Music.
- Code mode opens a real IDE: file explorer (left), code editor (center), terminal (bottom).
  Terminal supports: ls, cat <file>, npm install <pkg>, build, deploy, clear, help.
- Projects page lets users View files, Edit info, Download as ZIP, Transfer, Push to GitHub or CodeVerse, Publish to Community.
- Push button supports 4 targets: GitHub only, CodeVerse only, Both, or local download.
- Tokens: chat=2, code=5, image=8, video=10, music=8 (per request, +size factor). Free 1000/mo, refill via referrals.
- When users ask "how do I X" — explain step-by-step using the actual UI labels above.
- When generating code, write clean production-ready files. Use TypeScript + React + Tailwind by default. For varied styling, suggest different fonts (Inter, Space Grotesk, JetBrains Mono, Playfair Display, Bebas Neue) via Google Fonts <link> in index.html.
- Always offer 3 useful follow-up suggestions after a task.
`;

    if (mode === "chat") return `You are Stinger AI, a friendly, expert AI dev assistant. ${creatorInfo}\n${platformGuide}\nBe warm, concise, use markdown headings and emoji where helpful. When users ask about features, walk them through the exact UI flow.`;
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
    return `${toolPrompts[codeTool] || toolPrompts.code} ${creatorInfo}\n${platformGuide}

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

Generate complete, production-ready files. Include all necessary files for the project. Include package.json with dependencies. The terminal array should list commands to install dependencies. Use modern fonts (import via <link> in index.html) and varied typography to make the output look superb.`;
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
    if ((!input.trim() && attachments.length === 0) || isLoading) return;
    if (!isAdmin && tokenBalance <= 0) {
      toast.error("No tokens remaining. Share your referral link or wait for monthly refill.");
      return;
    }

    const attachedText = attachments
      .filter(a => a.kind !== "image" && a.text)
      .map(a => `\n\n[Attached: ${a.name}]\n${a.text}`).join("");
    const attachedImages = attachments.filter(a => a.kind === "image" && a.dataUrl).map(a => a.dataUrl!);
    const outgoing = `${input}${attachedText}`.trim();

    const userMsg: Message = { role: "user", content: input || "(attachment)", images: attachedImages.length ? attachedImages : undefined };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setAttachments([]);
    setIsLoading(true);
    setShowSuggestions(false);
    setSuggestions([]);
    void persistMessage("user", outgoing || "(attachment)");

    let assistantContent = "";

    try {
      const isImageGen = mode === "image";
      const isVideoGen = mode === "video";
      const isMusicGen = mode === "music";
      const selectedModel = getModelById(selectedModelId);

      // Music goes through ai-router (Suno/Mubert via davidcyril). Video stays on generate-media.
      if (isImageGen) {
        // Private image provider — endpoint & key live only in the edge function.
        const resp = await fetch(`${FN_BASE}/generate-image`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify({ prompt: outgoing }),
        });
        const data = await resp.json();
        if (!resp.ok || !data.image) throw new Error(data.error || "Image generation failed");
        assistantContent = `🖼️ Here's your image for: _${outgoing.slice(0, 120)}_`;
        setMessages(prev => [...prev, { role: "assistant", content: assistantContent, images: [data.image] }]);
        void persistMessage("assistant", assistantContent);
        if (user && !isAdmin) {
          const cost = getTokenCost(500);
          await supabase.from("token_balances").update({ balance: Math.max(0, tokenBalance - cost) }).eq("user_id", user.id);
          await supabase.from("token_transactions").insert({ user_id: user.id, amount: -cost, action: "image generation", description: outgoing.slice(0, 100) });
          refreshTokens();
        }
        setIsLoading(false);
        return;
      }

      if (isMusicGen) {
        const musicModel = selectedModel.provider === "music" ? selectedModel.model : "suno";
        const resp = await fetch(AI_ROUTER_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify({ provider: "music", model: musicModel, messages: [{ role: "user", content: outgoing }] }),
        });
        if (!resp.ok || !resp.body) throw new Error("Music generation failed");
        const reader = resp.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let idx: number;
          while ((idx = buf.indexOf("\n")) !== -1) {
            const line = buf.slice(0, idx).trim(); buf = buf.slice(idx + 1);
            if (!line.startsWith("data: ")) continue;
            const j = line.slice(6).trim();
            if (j === "[DONE]") continue;
            try {
              const p = JSON.parse(j);
              const c = p.choices?.[0]?.delta?.content;
              if (c) {
                assistantContent += c;
                setMessages(prev => {
                  const last = prev[prev.length - 1];
                  if (last?.role === "assistant" && prev[prev.length - 2]?.role === "user")
                    return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
                  return [...prev, { role: "assistant", content: assistantContent }];
                });
              }
            } catch {}
          }
        }
        if (user && !isAdmin) {
          const cost = getTokenCost(assistantContent.length);
          await supabase.from("token_balances").update({ balance: Math.max(0, tokenBalance - cost) }).eq("user_id", user.id);
          await supabase.from("token_transactions").insert({ user_id: user.id, amount: -cost, action: "music generation", description: input.slice(0, 100) });
          refreshTokens();
        }
        setIsLoading(false);
        return;
      }

      // Video: call generate-media (real provider with API key) — non-streaming JSON.
      if (isVideoGen) {
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-media`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            kind: isVideoGen ? "video" : "song",
            prompt: input,
            aspectRatio: "16:9",
            duration: isVideoGen ? 6 : 30,
            quality: "standard",
            style: isMusicGen ? "pop" : undefined,
          }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || "Media generation failed");
        const lines: string[] = [];
        if (data.url) {
          lines.push(`✅ **${isVideoGen ? "Video" : "Song"} ready!**`);
          lines.push("");
          lines.push(`[Download / Open](${data.url})`);
          if (isVideoGen) lines.push(`\n<video src="${data.url}" controls style="max-width:100%;border-radius:12px"></video>`);
          else lines.push(`\n<audio src="${data.url}" controls style="width:100%"></audio>`);
        } else if (data.queued) {
          lines.push(`⏳ ${data.message || "Generation queued."}`);
          lines.push(`\n_Provider returned no URL yet — your API key is configured but the upstream provider may be busy. Try again in a moment._`);
        }
        assistantContent = lines.join("\n");
        setMessages(prev => [...prev, { role: "assistant", content: assistantContent }]);
        // Token deduction (skip for admins)
        if (user && !isAdmin) {
          const cost = getTokenCost(assistantContent.length);
          await supabase.from("token_balances").update({ balance: Math.max(0, tokenBalance - cost) }).eq("user_id", user.id);
          await supabase.from("token_transactions").insert({
            user_id: user.id, amount: -cost, action: `${mode} generation`, description: input.slice(0, 100),
          });
          refreshTokens();
        }
        setIsLoading(false);
        return;
      }

      // Route to AI router (Hostify / DeepSeek / Anthropic / GAGA).
      const endpoint = AI_ROUTER_URL;
      const requestBody: any = {
        provider: selectedModel.provider,
        model: selectedModel.model,
        mode,
        messages: [
          { role: "system", content: getSystemPrompt() },
          ...newMessages.filter(m => !m.images).map(m => ({ role: m.role, content: m.content })),
        ],
      };

      if (mode === "code") {
        setBuildingProject(true);
        addTerminalLine("system", `🔨 Building: "${input.slice(0, 80)}..."`);
      }

      // Client-only providers (Puter / Qvac) bypass the edge function entirely
      if (isClientProvider(selectedModel.provider)) {
        const runner = selectedModel.provider === "puter" ? streamPuter : streamQvac;
        await new Promise<void>((resolve) => {
          let started = false;
          const flush = (chunk: string) => {
            assistantContent += chunk;
            setMessages(prev => {
              if (!started) { started = true; return [...prev, { role: "assistant", content: assistantContent }]; }
              return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
            });
          };
          runner({
            messages: requestBody.messages,
            model: selectedModel.model,
            onDelta: flush,
            onDone: () => resolve(),
            onError: (err) => { flush(`\n\n⚠️ ${err.message}`); resolve(); },
          });
        });
        setIsLoading(false);
        return;
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

      if (mode === "code") {
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

      if (assistantContent.trim()) void persistMessage("assistant", assistantContent);

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;

    for (const file of files) {
      if (file.size > 8 * 1024 * 1024) { toast.error(`${file.name} is larger than 8MB`); continue; }
      const isImage = file.type.startsWith("image/");
      const dataOrText = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("read failed"));
        if (isImage) reader.readAsDataURL(file); else reader.readAsText(file);
      }).catch(() => null as unknown as string);
      if (!dataOrText) { toast.error(`Could not read ${file.name}`); continue; }
      setAttachments(prev => [...prev, isImage
        ? { name: file.name, kind: "image", dataUrl: dataOrText }
        : { name: file.name, kind: "text", text: dataOrText.slice(0, 8000) }]);
    }
    toast.success(files.length > 1 ? `${files.length} files attached` : `${files[0].name} attached`);
  };

  const removeAttachment = (idx: number) => setAttachments(prev => prev.filter((_, i) => i !== idx));

  const transcribeAudio = async (blob: Blob) => {
    setTranscribing(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1] || "");
        reader.onerror = () => reject(new Error("read failed"));
        reader.readAsDataURL(blob);
      });
      const resp = await fetch(`${FN_BASE}/voice-transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ audio: base64, mime: blob.type || "audio/webm" }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.text) throw new Error(data.error || "Transcription failed");
      setInput(prev => (prev ? `${prev} ${data.text}` : data.text));
      inputRef.current?.focus();
      toast.success("Voice note transcribed");
    } catch (err: any) {
      toast.error(err.message || "Could not transcribe the voice note");
    } finally {
      setTranscribing(false);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) { mediaRecorderRef.current?.stop(); setIsRecording(false); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        if (blob.size < 1000) { toast.error("Recording was too short"); return; }
        await transcribeAudio(blob);
      };
      recorder.start(); mediaRecorderRef.current = recorder; setIsRecording(true);
      toast.info("Recording… tap the mic again to send");
    } catch { toast.error("Microphone access denied"); }
  };

  const viewCodeInResponse = (content: string) => { setCodePreviewContent(content); setShowCodePreview(true); };

  const ModeIcon = modeConfig[mode].icon;

  // Reusable model picker button — opens the visual card-grid dialog
  const ModelPicker = () => {
    const current = getModelById(selectedModelId);
    return (
      <button onClick={() => setShowModelPicker(true)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] bg-gradient-to-r from-primary/10 to-accent/10 hover:from-primary/20 hover:to-accent/20 text-foreground border border-primary/30 max-w-[180px] btn-hover">
        <Cpu size={11} className="text-primary flex-shrink-0" />
        <span className="truncate font-medium">{current.label}</span>
        {current.badge && <span className="text-[9px] px-1 rounded bg-accent/20 text-accent flex-shrink-0">{current.badge}</span>}
      </button>
    );
  };

  // Code mode layout
  if (mode === "code") {
    return (
      <div className="flex flex-col h-screen relative">
        <ModelPickerDialog open={showModelPicker} onClose={() => setShowModelPicker(false)} selectedId={selectedModelId} onSelect={setSelectedModelId} />
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
          {attachments.length > 0 && (
            <div className="max-w-4xl mx-auto flex flex-wrap gap-1.5 mb-2">
              {attachments.map((a, i) => (
                <span key={i} className="flex items-center gap-1.5 text-[10px] bg-secondary/80 border border-border/50 rounded-lg pl-2 pr-1 py-1 text-muted-foreground">
                  {a.kind === "image" && a.dataUrl && <img src={a.dataUrl} alt={a.name} className="w-5 h-5 rounded object-cover" />}
                  <span className="truncate max-w-[120px]">{a.name}</span>
                  <button onClick={() => removeAttachment(i)} className="hover:text-destructive"><X size={10} /></button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2 max-w-4xl mx-auto items-end">
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} accept=".txt,.js,.ts,.tsx,.jsx,.py,.json,.html,.css,.sql,.md,image/*" />
            <motion.button whileHover={{ scale: 1.1 }} onClick={handleFileAttach} className="p-2.5 rounded-xl bg-secondary text-muted-foreground hover:text-foreground">
              <Paperclip size={16} />
            </motion.button>
            <div className="flex-1 relative">
              <textarea ref={inputRef} rows={1} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Describe the project to build..."
                className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none overflow-y-auto max-h-[200px] leading-relaxed"
                disabled={isLoading} />
            </div>
            <motion.button onClick={handleSend} disabled={isLoading || (!input.trim() && attachments.length === 0)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
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
      <ModelPickerDialog open={showModelPicker} onClose={() => setShowModelPicker(false)} selectedId={selectedModelId} onSelect={setSelectedModelId} />
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
        {attachments.length > 0 && (
          <div className="max-w-4xl mx-auto flex flex-wrap gap-1.5 mb-2">
            {attachments.map((a, i) => (
              <span key={i} className="flex items-center gap-1.5 text-[10px] bg-secondary/80 border border-border/50 rounded-lg pl-2 pr-1 py-1 text-muted-foreground">
                {a.kind === "image" && a.dataUrl && <img src={a.dataUrl} alt={a.name} className="w-5 h-5 rounded object-cover" />}
                <span className="truncate max-w-[120px]">{a.name}</span>
                <button onClick={() => removeAttachment(i)} className="hover:text-destructive"><X size={10} /></button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2 max-w-4xl mx-auto items-end">
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} accept=".txt,.js,.ts,.tsx,.jsx,.py,.json,.html,.css,.sql,.md,image/*" />
          <motion.button whileHover={{ scale: 1.1 }} onClick={handleFileAttach} className="p-2.5 rounded-xl bg-secondary text-muted-foreground hover:text-foreground">
            <Paperclip size={16} />
          </motion.button>
          <motion.button whileHover={{ scale: 1.1 }} onClick={toggleRecording} disabled={transcribing}
            title={isRecording ? "Stop & send voice note" : "Record a voice note"}
            className={`p-2.5 rounded-xl transition-all disabled:opacity-50 ${isRecording ? "bg-destructive text-white animate-pulse" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
            {transcribing ? <Loader2 size={16} className="animate-spin" /> : <Mic size={16} />}
          </motion.button>
          <div className="flex-1 relative">
            <textarea ref={inputRef} rows={1} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={mode === "chat" ? "Discuss your ideas..." : mode === "image" ? "Describe the image you want to generate..." : `Describe what to create...`}
              className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none overflow-y-auto max-h-[200px] leading-relaxed"
              disabled={isLoading} />
          </div>
          <motion.button onClick={handleSend} disabled={isLoading || (!input.trim() && attachments.length === 0)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
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
