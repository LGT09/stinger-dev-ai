import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import logo from "@/assets/logo.png";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SharedChat = () => {
  const { code } = useParams<{ code: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return;
    supabase.from("shared_chats").select("*").eq("share_code", code).single().then(({ data }) => {
      if (data) {
        setTitle(data.title);
        try { setMessages(JSON.parse(data.messages as string)); } catch { setMessages([]); }
      }
      setLoading(false);
    });
  }, [code]);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-sm text-muted-foreground animate-pulse">Loading...</p></div>;
  if (!messages.length) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-sm text-muted-foreground">Chat not found</p></div>;

  return (
    <div className="min-h-screen bg-background p-4 max-w-3xl mx-auto" data-theme="neon">
      <div className="flex items-center gap-2 mb-6">
        <img src={logo} alt="Stinger" className="w-8 h-8" />
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">Shared from Stinger Dev</p>
        </div>
      </div>
      <div className="space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Sparkles size={14} className="text-primary" />
              </div>
            )}
            <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "glass"}`}>
              {msg.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
              ) : (
                <div className="whitespace-pre-wrap">{msg.content}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SharedChat;
