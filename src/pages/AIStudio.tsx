import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Code, Image, Video, Music, Sparkles, Loader2, Copy, Share2, FolderPlus, Download, Globe, Bot, Database, AppWindow, Mic, Paperclip, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

const aiTools = [
  { id: "code", label: "Code AI", icon: Code, model: "google/gemini-3-flash-preview", cost: 10 },
  { id: "app", label: "App Builder", icon: AppWindow, model: "google/gemini-2.5-pro", cost: 20 },
  { id: "website", label: "Website Builder", icon: Globe, model: "google/gemini-2.5-pro", cost: 20 },
  { id: "bot", label: "Bot Generator", icon: Bot, model: "google/gemini-2.5-flash", cost: 15 },
  { id: "api", label: "API Generator", icon: Code, model: "google/gemini-2.5-flash", cost: 15 },
  { id: "database", label: "DB Designer", icon: Database, model: "google/gemini-2.5-flash", cost: 15 },
  { id: "image", label: "Image AI", icon: Image, model: "google/gemini-2.5-flash", cost: 25 },
  { id: "video", label: "Video AI", icon: Video, model: "google/gemini-2.5-flash", cost: 30 },
  { id: "music", label: "Music AI", icon: Music, model: "google/gemini-2.5-flash", cost: 25 },
];

interface Message {
  role: "user" | "assistant";
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

const AIStudio = () => {
  const { user, tokenBalance, refreshTokens } = useAuth();
  const [selectedTool, setSelectedTool] = useState("code");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! I'm **Stinger AI**. Select a tool and describe what you'd like to create. I can generate code, build apps, design APIs, create images, and much more." },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startNewChat = () => {
    setMessages([{ role: "assistant", content: "New conversation started. How can I help you?" }]);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    if (tokenBalance <= 0) {
      toast.error("No tokens remaining. Share your referral link or wait for monthly refill.");
      return;
    }

    const userMsg: Message = { role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";
    const toolConfig = aiTools.find((m) => m.id === selectedTool);
    const systemPrompts: Record<string, string> = {
      code: "You are a senior full-stack developer. Generate clean, production-ready code with comments. Use modern best practices.",
      app: "You are an expert app builder. Generate complete React application code with components, routing, and state management.",
      website: "You are a website builder expert. Generate complete HTML/CSS/JS websites with modern responsive design.",
      bot: "You are a chatbot builder. Generate bot logic, conversation flows, and integration code.",
      api: "You are an API architect. Generate RESTful API endpoints, schemas, and middleware code.",
      database: "You are a database architect. Generate SQL schemas, migrations, indexes, and RLS policies.",
      image: "You are a creative AI assistant. Describe images in detail and help with visual concepts.",
      video: "You are a video production AI. Help with video scripts, storyboards, and editing concepts.",
      music: "You are a music composition AI. Help with music theory, lyrics, and composition concepts.",
    };

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompts[selectedTool] || systemPrompts.code },
            ...newMessages.map((m) => ({ role: m.role, content: m.content })),
          ],
          model: toolConfig?.model,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || `Error ${resp.status}`);
      }
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
              setMessages((prev) => {
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

      // Dynamic token cost based on response size
      if (user) {
        const baseCost = toolConfig?.cost || 10;
        const sizeFactor = Math.ceil(assistantContent.length / 500);
        const cost = Math.max(baseCost, baseCost * sizeFactor);
        await supabase.from("token_balances").update({ balance: tokenBalance - cost }).eq("user_id", user.id);
        await supabase.from("token_transactions").insert({
          user_id: user.id,
          amount: -cost,
          action: `${selectedTool} generation`,
          description: input.slice(0, 100),
        });
        refreshTokens();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to get response");
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, an error occurred. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveAsProject = async () => {
    if (!user) return;
    const codeMessages = messages.filter((m) => m.role === "assistant" && m.content.includes("```"));
    const codeContent = codeMessages.map((m) => m.content).join("\n\n---\n\n");
    if (!codeContent) {
      toast.error("No code found in this conversation");
      return;
    }
    const { error } = await supabase.from("projects").insert({
      user_id: user.id,
      name: `AI ${selectedTool} - ${new Date().toLocaleDateString()}`,
      description: messages.find((m) => m.role === "user")?.content?.slice(0, 200) || "AI Generated",
      code_content: codeContent,
      language: selectedTool === "database" ? "SQL" : "React",
    });
    if (error) toast.error("Failed to save project");
    else toast.success("Saved to your projects!");
  };

  const shareChat = async () => {
    if (!user) return;
    const { data, error } = await supabase.from("shared_chats").insert({
      user_id: user.id,
      title: `${selectedTool} chat`,
      messages: JSON.stringify(messages),
    }).select("share_code").single();
    if (error) toast.error("Failed to share");
    else {
      const url = `${window.location.origin}/shared/${data.share_code}`;
      navigator.clipboard.writeText(url);
      toast.success("Share link copied to clipboard!");
    }
  };

  const downloadChat = () => {
    const content = messages.map((m) => `${m.role === "user" ? "USER" : "AI"}: ${m.content}`).join("\n\n");
    const blob = new Blob([content], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `stinger-${selectedTool}-${Date.now()}.txt`;
    a.click();
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        toast.info("Audio recorded — voice-to-text coming soon");
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      toast.error("Microphone access denied");
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Tool selector */}
      <div className="border-b border-border/50 p-2 flex items-center gap-1.5 overflow-x-auto">
        <button onClick={startNewChat} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-secondary whitespace-nowrap">
          <Plus size={12} /> New
        </button>
        <div className="w-px h-5 bg-border/50 mx-1" />
        {aiTools.map(({ id, label, icon: Icon, cost }) => (
          <button
            key={id}
            onClick={() => setSelectedTool(id)}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              selectedTool === id ? "bg-primary/10 text-primary border border-primary/30" : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            <Icon size={12} />
            <span className="hidden sm:inline">{label}</span>
            <span className="text-[10px] opacity-60">{cost}t</span>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={saveAsProject} className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary" title="Save as project">
            <FolderPlus size={14} />
          </button>
          <button onClick={shareChat} className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary" title="Share chat">
            <Share2 size={14} />
          </button>
          <button onClick={downloadChat} className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary" title="Download">
            <Download size={14} />
          </button>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles size={12} className="text-primary" />
            {tokenBalance}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Sparkles size={14} className="text-primary" />
              </div>
            )}
            <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm relative group ${msg.role === "user" ? "bg-primary text-primary-foreground" : "glass"}`}>
              {msg.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none prose-pre:bg-secondary prose-pre:rounded-lg prose-pre:p-3 prose-code:text-primary">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <div className="whitespace-pre-wrap break-words">{msg.content}</div>
              )}
              {msg.role === "assistant" && i > 0 && (
                <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button onClick={() => { navigator.clipboard.writeText(msg.content); toast.success("Copied"); }} className="p-1 rounded bg-secondary">
                    <Copy size={10} />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Loader2 size={14} className="text-primary animate-spin" />
            </div>
            <div className="glass rounded-xl px-4 py-2.5 text-sm text-muted-foreground">Thinking...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border/50 p-3">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <button onClick={toggleRecording} className={`p-2.5 rounded-xl transition-colors ${isRecording ? "bg-destructive text-white animate-pulse" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
            <Mic size={16} />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={`Describe what to create with ${aiTools.find((m) => m.id === selectedTool)?.label}...`}
            className="flex-1 bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            disabled={isLoading}
          />
          <button onClick={handleSend} disabled={isLoading || !input.trim()} className="bg-primary text-primary-foreground rounded-xl px-4 py-2.5 hover:opacity-90 disabled:opacity-50">
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIStudio;
