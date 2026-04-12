import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Bot, Code, Image, Video, Music, Sparkles } from "lucide-react";

const models = [
  { id: "code", label: "Code AI", icon: Code },
  { id: "image", label: "Image AI", icon: Image },
  { id: "video", label: "Video AI", icon: Video },
  { id: "music", label: "Music AI", icon: Music },
];

interface Message {
  role: "user" | "assistant";
  content: string;
}

const AIStudio = () => {
  const [selectedModel, setSelectedModel] = useState("code");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! I'm Stinger AI. Select a model and describe what you'd like to create." },
  ]);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      { role: "user", content: input },
      { role: "assistant", content: `Processing your ${selectedModel} request... (AI integration coming soon)` },
    ]);
    setInput("");
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Model selector */}
      <div className="border-b border-border/50 p-3 flex gap-2 overflow-x-auto">
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
            <div
              className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "glass"
              }`}
            >
              {msg.content}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Input */}
      <div className="border-t border-border/50 p-4">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={`Describe what to generate with ${selectedModel}...`}
            className="flex-1 bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <button
            onClick={handleSend}
            className="bg-primary text-primary-foreground rounded-xl px-4 py-2.5 hover:opacity-90 transition-opacity"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIStudio;
