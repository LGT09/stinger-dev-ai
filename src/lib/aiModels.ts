export type AIProvider = "lovable" | "openai" | "deepseek" | "anthropic" | "hostify";

export interface AIModelOption {
  id: string;            // unique key used in UI
  provider: AIProvider;
  model: string;         // model id sent to upstream
  label: string;         // display name
  badge?: string;        // small chip e.g. "Hostify"
  description?: string;
  supportsImage?: boolean;
}

export const AI_MODELS: AIModelOption[] = [
  // Lovable AI Gateway (default, free of API-key setup)
  { id: "lovable-gemini-3-flash", provider: "lovable", model: "google/gemini-3-flash-preview", label: "Gemini 3 Flash", description: "Fast, balanced — default" },
  { id: "lovable-gemini-2.5-pro", provider: "lovable", model: "google/gemini-2.5-pro",        label: "Gemini 2.5 Pro", description: "Heavy reasoning + multimodal" },
  { id: "lovable-gemini-2.5-flash", provider: "lovable", model: "google/gemini-2.5-flash",    label: "Gemini 2.5 Flash", description: "Cheap & fast" },
  { id: "lovable-gpt-5",          provider: "lovable", model: "openai/gpt-5",                  label: "GPT-5",          description: "Top reasoning (via Lovable AI)" },
  { id: "lovable-gpt-5-mini",     provider: "lovable", model: "openai/gpt-5-mini",             label: "GPT-5 Mini",     description: "Balanced GPT-5" },

  // OpenAI direct
  { id: "openai-gpt-4o",          provider: "openai",  model: "gpt-4o",                         label: "GPT-4o",         description: "OpenAI direct" },
  { id: "openai-gpt-4o-mini",     provider: "openai",  model: "gpt-4o-mini",                    label: "GPT-4o Mini",    description: "OpenAI direct, fast" },

  // DeepSeek direct
  { id: "deepseek-chat",          provider: "deepseek", model: "deepseek-chat",                 label: "DeepSeek Chat",  description: "DeepSeek V3" },
  { id: "deepseek-reasoner",      provider: "deepseek", model: "deepseek-reasoner",             label: "DeepSeek R1",    description: "Reasoning model" },

  // Anthropic direct
  { id: "claude-3-5-sonnet",      provider: "anthropic", model: "claude-3-5-sonnet-20241022",   label: "Claude 3.5 Sonnet", description: "Anthropic flagship" },
  { id: "claude-3-5-haiku",       provider: "anthropic", model: "claude-3-5-haiku-20241022",    label: "Claude 3.5 Haiku",  description: "Fast Anthropic" },

  // Hostify (badge-flagged)
  { id: "hostify-letmegpt",       provider: "hostify", model: "letmegpt",         label: "LetMeGPT",       badge: "Hostify", description: "Hostify general chat" },
  { id: "hostify-grok",           provider: "hostify", model: "grok",             label: "Grok (Hostify)", badge: "Hostify", description: "Hostify Grok proxy" },
  { id: "hostify-gemini",         provider: "hostify", model: "gemini",           label: "Gemini (Hostify)", badge: "Hostify", description: "Hostify Gemini" },
  { id: "hostify-gemini-v2",      provider: "hostify", model: "gemini-v2",        label: "Gemini v2 (Hostify)", badge: "Hostify", description: "Hostify Gemini v2" },
  { id: "hostify-notegpt-r1",     provider: "hostify", model: "notegpt-deepseek", label: "NoteGPT DeepSeek-R1", badge: "Hostify", description: "Hostify deep-think reasoning (streamed)" },
];

export const DEFAULT_MODEL_ID = "lovable-gemini-3-flash";

export function getModelById(id: string): AIModelOption {
  return AI_MODELS.find(m => m.id === id) || AI_MODELS[0];
}