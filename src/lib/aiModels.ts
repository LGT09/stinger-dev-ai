export type AIProvider = "lovable" | "deepseek" | "anthropic" | "puter" | "qvac";

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
  // Lovable AI Gateway — primary
  { id: "lovable-gemini-flash",   provider: "lovable", model: "google/gemini-3-flash-preview", label: "Gemini 3 Flash", badge: "Lovable", description: "Lovable AI gateway — fast" },
  { id: "lovable-gemini-pro",     provider: "lovable", model: "google/gemini-2.5-pro",         label: "Gemini 2.5 Pro", badge: "Lovable", description: "Lovable AI gateway — top quality" },
  { id: "lovable-gpt5",           provider: "lovable", model: "openai/gpt-5",                  label: "GPT-5",           badge: "Lovable", description: "OpenAI GPT-5 via Lovable" },
  { id: "lovable-gpt5-mini",      provider: "lovable", model: "openai/gpt-5-mini",             label: "GPT-5 Mini",      badge: "Lovable", description: "Fast & cheap GPT-5" },

  // Anthropic direct
  { id: "claude-3-5-sonnet",      provider: "anthropic", model: "claude-3-5-sonnet-20241022",   label: "Claude 3.5 Sonnet", description: "Anthropic flagship" },
  { id: "claude-3-5-haiku",       provider: "anthropic", model: "claude-3-5-haiku-20241022",    label: "Claude 3.5 Haiku",  description: "Fast Anthropic" },
  { id: "claude-3-opus",          provider: "anthropic", model: "claude-3-opus-20240229",       label: "Claude 3 Opus",     description: "Deep reasoning" },

  // DeepSeek direct
  { id: "deepseek-chat",          provider: "deepseek", model: "deepseek-chat",                 label: "DeepSeek V3",    description: "DeepSeek general chat" },
  { id: "deepseek-reasoner",      provider: "deepseek", model: "deepseek-reasoner",             label: "DeepSeek R1",    description: "Step-by-step reasoning" },

  // Puter.js — browser-only, no key required (user-pays)
  { id: "puter-gpt-5",            provider: "puter",    model: "gpt-5",                         label: "Puter · GPT-5",   badge: "Puter", description: "Free via Puter.js (runs in browser)" },
  { id: "puter-gpt-4o-mini",      provider: "puter",    model: "gpt-4o-mini",                   label: "Puter · GPT-4o mini", badge: "Puter", description: "Free via Puter.js" },
  { id: "puter-claude",           provider: "puter",    model: "claude-3-5-sonnet",             label: "Puter · Claude 3.5", badge: "Puter", description: "Claude 3.5 via Puter.js" },

  // Qvac — fully on-device LLM in browser
  { id: "qvac-llama-3-2-1b",      provider: "qvac",     model: "LLAMA_3_2_1B_INST_Q4_0",        label: "Qvac · Llama 3.2 1B", badge: "On-device", description: "Runs locally in your browser — private, no network" },
];

export const DEFAULT_MODEL_ID = "lovable-gemini-flash";

export function getModelById(id: string): AIModelOption {
  return AI_MODELS.find(m => m.id === id) || AI_MODELS[0];
}