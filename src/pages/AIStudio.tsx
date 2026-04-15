import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Code, Image, Video, Music, Sparkles, Loader2, Copy, Share2,
  FolderPlus, Download, Globe, Bot, Database, AppWindow, Mic, Paperclip,
  Plus, MessageSquare, History, FileCode, Eye,
  Lightbulb, X
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

type AIMode = "chat" | "code" | "image" | "video" | "music";

const modeConfig: Record<AIMode, { label: string; icon: React.ElementType; color: string; desc: string }> = {
  chat: { label: "Chat", icon: MessageSquare, color: "text-accent", desc: "Discuss ideas & refine prompts" },
  code: { label: "Code", icon: Code, color: "text-primary", desc: "Generate full project code" },
  image: { label: "Image", icon: Image, color: "text-pink-400", desc: "Generate images from text" },
  video: { label: "Video", icon: Video, color: "text-purple-400", desc: "Create video concepts" },
  music: { label: "Music", icon: Music, color: "text-green-400", desc: "Compose music & lyrics" },
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

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

    const toolPrompts: Record<string, string> = {
      code: "You are a senior full-stack developer. Generate clean, production-ready code with file structure.",
      app: "You are an expert app builder. Generate complete React/React Native applications.",
      website: "You are a website builder. Generate complete responsive websites.",
      bot: "You are a chatbot builder. Generate complete bot logic.",
      api: "You are an API architect. Generate complete RESTful APIs.",
      database: "You are a database architect. Generate SQL schemas, migrations, and RLS policies.",
    };
    return `${toolPrompts[codeTool] || toolPrompts.code} ${creatorInfo} After generating code, provide suggestions under "## 💡 Suggestions".`;
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
      let model = "google/gemini-3-flash-preview";
      if (isImageGen) model = "google/gemini-3.1-flash-image-preview";
      else if (mode === "code") model = "google/gemini-2.5-pro";

      const requestBody: any = {
        messages: [
          { role: "system", content: getSystemPrompt() },
          ...newMessages.filter(m => !m.images).map(m => ({ role: m.role, content: m.content })),
        ],
        model,
      };

      if (isImageGen) {
        requestBody.modalities = ["image", "text"];
      }

      const resp = await fetch(CHAT_URL, {
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
        // Non-streaming response for image generation
        const data = await resp.json();
        const content = data.choices?.[0]?.message?.content || "Image generated!";
        const images = data.choices?.[0]?.message?.images?.map((img: any) => img.image_url?.url).filter(Boolean) || [];
        assistantContent = content;
        setMessages(prev => [...prev, { role: "assistant", content, images }]);
      } else {
        // Streaming for text
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

      // Extract suggestions from code mode
      if (mode === "code" && assistantContent.includes("## 💡 Suggestions")) {
        const sugSection = assistantContent.split("## 💡 Suggestions")[1];
        if (sugSection) {
          const lines = sugSection.split("\n").filter(l => /^\d+\./.test(l.trim()));
          setSuggestions(lines.map(l => l.replace(/^\d+\.\s*/, "").trim()).slice(0, 6));
          setShowSuggestions(true);
        }
      }

      // Auto-create project in code mode
      if (mode === "code" && assistantContent.includes("```") && user) {
        const projectName = `AI ${codeTool} - ${new Date().toLocaleDateString()}`;
        const userPrompt = messages.find(m => m.role === "user")?.content?.slice(0, 200) || "AI Generated";
        await supabase.from("projects").insert({
          user_id: user.id, name: projectName, description: userPrompt,
          code_content: assistantContent, language: codeTool === "database" ? "SQL" : "React", status: "Active",
        });
        toast.success("Project auto-saved!", { duration: 3000 });
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
    } finally {
      setIsLoading(false);
    }
  };

  const saveAsProject = async () => {
    if (!user) return;
    const codeMessages = messages.filter(m => m.role === "assistant" && m.content.includes("```"));
    const codeContent = codeMessages.map(m => m.content).join("\n\n---\n\n");
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

        {mode === "code" && (
          <>
            <div className="w-px h-5 bg-border/50 mx-1" />
            {codeTools.map(({ id, label, icon: Icon }) => (
              <motion.button key={id} onClick={() => setCodeTool(id)} whileHover={{ scale: 1.05 }}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] transition-all whitespace-nowrap ${
                  codeTool === id ? "bg-accent/15 text-accent border border-accent/30" : "text-muted-foreground/70 hover:bg-secondary/60"
                }`}>
                <Icon size={10} /><span className="hidden sm:inline">{label}</span>
              </motion.button>
            ))}
          </>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          <motion.button whileHover={{ scale: 1.1 }} onClick={saveAsProject} className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary" title="Save"><FolderPlus size={14} /></motion.button>
          <motion.button whileHover={{ scale: 1.1 }} onClick={shareChat} className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary" title="Share"><Share2 size={14} /></motion.button>
          <motion.button whileHover={{ scale: 1.1 }} onClick={downloadChat} className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary" title="Download"><Download size={14} /></motion.button>
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
              {/* Show generated images */}
              {msg.images && msg.images.length > 0 && (
                <div className="mt-3 grid gap-2">
                  {msg.images.map((imgUrl, idx) => (
                    <img key={idx} src={imgUrl} alt={`Generated image ${idx + 1}`} className="rounded-lg max-w-full border border-border/50 hover:scale-[1.02] transition-transform cursor-pointer" onClick={() => window.open(imgUrl, "_blank")} />
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

      {/* Suggestions */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="px-4 pb-2">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb size={12} className="text-primary" />
              <span className="text-xs text-muted-foreground">Suggestions:</span>
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
