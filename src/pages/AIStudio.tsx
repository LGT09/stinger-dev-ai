import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Code, Image, Video, Music, Sparkles, Loader2, Copy, Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const models = [
  { id: "code", label: "Code AI", icon: Code, model: "google/gemini-3-flash-preview" },
  { id: "image", label: "Image AI", icon: Image, model: "google/gemini-2.5-flash" },
  { id: "video", label: "Video AI", icon: Video, model: "google/gemini-2.5-flash" },
  { id: "music", label: "Music AI", icon: Music, model: "google/gemini-2.5-flash" },
];

interface Message {
  role: "user" | "assistant";
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

const AIStudio = () => {
  const { user, tokenBalance, refreshTokens } = useAuth();
  const [selectedModel, setSelectedModel] = useState("code");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! I'm Stinger AI. Select a model and describe what you'd like to create. I can generate code, help design apps, create APIs, and more." },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    if (tokenBalance <= 0) {
      toast.error("No tokens remaining. Purchase more to continue.");
      return;
    }

    const userMsg: Message = { role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";
    const modelConfig = models.find((m) => m.id === selectedModel);

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          model: modelConfig?.model,
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

      // Deduct tokens
      if (user) {
        const cost = selectedModel === "code" ? 10 : 25;
        await supabase.from("token_balances").update({ balance: tokenBalance - cost }).eq("user_id", user.id);
        await supabase.from("token_transactions").insert({
          user_id: user.id,
          amount: -cost,
          action: `${selectedModel} generation`,
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Model selector */}
      <div className="border-b border-border/50 p-3 flex items-center gap-2 overflow-x-auto">
        {models.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSelectedModel(id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              selectedModel === id
                ? "bg-primary/10 text-primary border border-primary/30"
                : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
        <div className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
          <Sparkles size={12} className="text-primary" />
          {tokenBalance} tokens
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Sparkles size={14} className="text-primary" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm relative group ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground"
                : "glass"
            }`}>
              <div className="whitespace-pre-wrap break-words">{msg.content}</div>
              {msg.role === "assistant" && i > 0 && (
                <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button onClick={() => copyToClipboard(msg.content)} className="p-1 rounded bg-secondary">
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
            <div className="glass rounded-xl px-4 py-2.5 text-sm text-muted-foreground">
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border/50 p-4">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={`Describe what to generate with ${models.find((m) => m.id === selectedModel)?.label}...`}
            className="flex-1 bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-primary text-primary-foreground rounded-xl px-4 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIStudio;
