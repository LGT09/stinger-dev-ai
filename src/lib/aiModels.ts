export type AIProvider = "hostify" | "music";

export interface AIModelOption {
  id: string;
  provider: AIProvider;
  model: string;
  label: string;
  badge?: string;
  description?: string;
  category?: "chat" | "code" | "reasoning" | "music";
}

/**
 * Single unified model — "Hostify AI". Routes server-side through
 * api.hostify.co.zw with auto-fallback across grok → gemini → deepseek.
 */
export const AI_MODELS: AIModelOption[] = [
  {
    id: "hostify-ai",
    provider: "hostify",
    model: "auto",
    label: "Hostify AI",
    badge: "Powered by Hostify",
    category: "chat",
    description: "Unified model with auto-fallback across Grok, Gemini and DeepSeek.",
  },
  { id: "music-suno",   provider: "music", model: "suno",   label: "Suno",   badge: "Music", category: "music" },
  { id: "music-mubert", provider: "music", model: "mubert", label: "Mubert", badge: "Music", category: "music" },
];

export const DEFAULT_MODEL_ID = "hostify-ai";
export const DEFAULT_MUSIC_MODEL_ID = "music-suno";

export function getModelById(id: string): AIModelOption {
  return AI_MODELS.find(m => m.id === id) || AI_MODELS[0];
}

export const MODEL_CATEGORIES = [
  { id: "chat", label: "Chat" },
  { id: "code", label: "Code" },
  { id: "music", label: "Music" },
] as const;
