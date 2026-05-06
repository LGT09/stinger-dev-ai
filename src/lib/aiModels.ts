export type AIProvider = "deepseek" | "anthropic" | "puter" | "qvac" | "davidcyril" | "music";

export interface AIModelOption {
  id: string;
  provider: AIProvider;
  model: string;
  label: string;
  badge?: string;
  description?: string;
  category?: "chat" | "code" | "reasoning" | "vision" | "music" | "ondevice";
}

export const AI_MODELS: AIModelOption[] = [
  // Anthropic
  { id: "claude-3-5-sonnet",  provider: "anthropic", model: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet", badge: "Anthropic", category: "chat", description: "Flagship reasoning + writing" },
  { id: "claude-3-5-haiku",   provider: "anthropic", model: "claude-3-5-haiku-20241022",  label: "Claude 3.5 Haiku",  badge: "Anthropic", category: "chat", description: "Fastest Claude" },
  { id: "claude-3-opus",      provider: "anthropic", model: "claude-3-opus-20240229",     label: "Claude 3 Opus",     badge: "Anthropic", category: "reasoning", description: "Deepest reasoning" },

  // DeepSeek
  { id: "deepseek-chat",      provider: "deepseek",  model: "deepseek-chat",     label: "DeepSeek V3",  badge: "DeepSeek", category: "chat", description: "General chat" },
  { id: "deepseek-reasoner",  provider: "deepseek",  model: "deepseek-reasoner", label: "DeepSeek R1",  badge: "DeepSeek", category: "reasoning", description: "Step-by-step reasoning" },

  // davidcyril.name.ng — free public AI gateway
  { id: "dc-chatgpt",         provider: "davidcyril", model: "chatgpt",                label: "ChatGPT",       badge: "Free", category: "chat" },
  { id: "dc-gpt4omini",       provider: "davidcyril", model: "gpt4omini",              label: "GPT-4o Mini",   badge: "Free", category: "chat" },
  { id: "dc-gpt44",           provider: "davidcyril", model: "gpt44",                  label: "GPT-4.4",       badge: "Free", category: "chat" },
  { id: "dc-claude",          provider: "davidcyril", model: "claude",                 label: "Claude (free)", badge: "Free", category: "chat" },
  { id: "dc-claudeSonnet",    provider: "davidcyril", model: "claudeSonnet",           label: "Claude Sonnet (free)", badge: "Free", category: "chat" },
  { id: "dc-gemini",          provider: "davidcyril", model: "gemini",                 label: "Gemini",        badge: "Free", category: "chat" },
  { id: "dc-google-gemini",   provider: "davidcyril", model: "google-gemini",          label: "Google Gemini", badge: "Free", category: "chat" },
  { id: "dc-gemma",           provider: "davidcyril", model: "gemma",                  label: "Gemma",         badge: "Free", category: "chat" },
  { id: "dc-deepseek-v3",     provider: "davidcyril", model: "deepseek-v3",            label: "DeepSeek V3 (free)", badge: "Free", category: "chat" },
  { id: "dc-deepseek-r1",     provider: "davidcyril", model: "deepseek-r1",            label: "DeepSeek R1 (free)", badge: "Free", category: "reasoning" },
  { id: "dc-deepseek-67b",    provider: "davidcyril", model: "deepseek-llm-67b-chat",  label: "DeepSeek 67B",  badge: "Free", category: "chat" },
  { id: "dc-qwen",            provider: "davidcyril", model: "qwen2Coder",             label: "Qwen 2 Coder",  badge: "Free", category: "code" },
  { id: "dc-llamacoder",      provider: "davidcyril", model: "llamacoder",             label: "Llama Coder",   badge: "Free", category: "code" },
  { id: "dc-copilot",         provider: "davidcyril", model: "copilot",                label: "Copilot",       badge: "Free", category: "code" },
  { id: "dc-perplexity",      provider: "davidcyril", model: "perplexity",             label: "Perplexity",    badge: "Free", category: "chat" },
  { id: "dc-g4f-groq",        provider: "davidcyril", model: "g4f-groq",               label: "Groq (g4f)",    badge: "Free", category: "chat" },

  // Puter — browser, no key
  { id: "puter-gpt-5",        provider: "puter",     model: "gpt-5",             label: "Puter · GPT-5",       badge: "Puter", category: "chat" },
  { id: "puter-gpt-4o-mini",  provider: "puter",     model: "gpt-4o-mini",       label: "Puter · GPT-4o mini", badge: "Puter", category: "chat" },
  { id: "puter-claude",       provider: "puter",     model: "claude-3-5-sonnet", label: "Puter · Claude 3.5",  badge: "Puter", category: "chat" },

  // Qvac — on-device
  { id: "qvac-llama-3-2-1b",  provider: "qvac",      model: "LLAMA_3_2_1B_INST_Q4_0", label: "Qvac · Llama 3.2 1B", badge: "On-device", category: "ondevice", description: "Runs locally — fully private" },

  // Music (Suno + Mubert) — also exposed as 'models' so picker can route
  { id: "music-suno",         provider: "music",     model: "suno",   label: "Suno",   badge: "Music", category: "music" },
  { id: "music-mubert",       provider: "music",     model: "mubert", label: "Mubert", badge: "Music", category: "music" },
];

export const DEFAULT_MODEL_ID = "claude-3-5-sonnet";
export const DEFAULT_MUSIC_MODEL_ID = "music-suno";

export function getModelById(id: string): AIModelOption {
  return AI_MODELS.find(m => m.id === id) || AI_MODELS[0];
}

export const MODEL_CATEGORIES = [
  { id: "chat", label: "Chat" },
  { id: "code", label: "Code" },
  { id: "reasoning", label: "Reasoning" },
  { id: "music", label: "Music" },
  { id: "ondevice", label: "On-device" },
] as const;
