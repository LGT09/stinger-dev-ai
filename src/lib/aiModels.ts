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
  // Hostify (free, no key required) — primary provider
  { id: "hostify-letmegpt",       provider: "hostify", model: "letmegpt",         label: "LetMeGPT",        badge: "Hostify", description: "Hostify general chat — fast & free" },
  { id: "hostify-grok",           provider: "hostify", model: "grok",             label: "Grok",            badge: "Hostify", description: "Grok-style assistant via Hostify" },
  { id: "hostify-gemini",         provider: "hostify", model: "gemini",           label: "Gemini (Hostify)",badge: "Hostify", description: "Google Gemini via Hostify" },
  { id: "hostify-gemini-v2",      provider: "hostify", model: "gemini-v2",        label: "Gemini v2",       badge: "Hostify", description: "Gemini v2 via Hostify" },
  { id: "hostify-deepseek-r1",    provider: "hostify", model: "notegpt-deepseek", label: "DeepSeek R1",     badge: "Hostify", description: "DeepSeek R1 deep-think via Hostify (streaming)" },

  // Lovable AI Gateway (used for image generation always)
  { id: "lovable-gemini-flash",   provider: "lovable", model: "google/gemini-3-flash-preview", label: "Gemini 3 Flash", badge: "Lovable", description: "Lovable AI gateway — fast" },
  { id: "lovable-gemini-pro",     provider: "lovable", model: "google/gemini-2.5-pro",         label: "Gemini 2.5 Pro", badge: "Lovable", description: "Lovable AI gateway — top quality" },

  // OpenAI direct
  { id: "openai-gpt-4o",          provider: "openai",  model: "gpt-4o",                         label: "GPT-4o",         description: "OpenAI flagship multimodal" },
  { id: "openai-gpt-4o-mini",     provider: "openai",  model: "gpt-4o-mini",                    label: "GPT-4o Mini",    description: "Fast & cheap OpenAI" },
  { id: "openai-gpt-4-turbo",     provider: "openai",  model: "gpt-4-turbo",                    label: "GPT-4 Turbo",    description: "OpenAI heavy reasoning" },

  // Anthropic direct
  { id: "claude-3-5-sonnet",      provider: "anthropic", model: "claude-3-5-sonnet-20241022",   label: "Claude 3.5 Sonnet", description: "Anthropic flagship" },
  { id: "claude-3-5-haiku",       provider: "anthropic", model: "claude-3-5-haiku-20241022",    label: "Claude 3.5 Haiku",  description: "Fast Anthropic" },
  { id: "claude-3-opus",          provider: "anthropic", model: "claude-3-opus-20240229",       label: "Claude 3 Opus",     description: "Deep reasoning" },

  // DeepSeek direct
  { id: "deepseek-chat",          provider: "deepseek", model: "deepseek-chat",                 label: "DeepSeek V3",    description: "DeepSeek general chat" },
  { id: "deepseek-reasoner",      provider: "deepseek", model: "deepseek-reasoner",             label: "DeepSeek R1",    description: "Step-by-step reasoning" },
];

export const DEFAULT_MODEL_ID = "hostify-letmegpt";

export function getModelById(id: string): AIModelOption {
  return AI_MODELS.find(m => m.id === id) || AI_MODELS[0];
}