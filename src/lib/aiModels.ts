export type AIProvider = "lovable" | "openai" | "deepseek" | "anthropic";

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

export const DEFAULT_MODEL_ID = "openai-gpt-4o-mini";

export function getModelById(id: string): AIModelOption {
  return AI_MODELS.find(m => m.id === id) || AI_MODELS[0];
}