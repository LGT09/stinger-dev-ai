export type AIProvider = "hostify" | "gaga" | "music" | "video" | "image";

export interface AIModelOption {
  id: string;
  provider: AIProvider;
  model: string;
  label: string;
  badge?: string;
  description?: string;
  category?: "chat" | "code" | "reasoning" | "music" | "video" | "image";
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
  {
    id: "gaga-ai-nexus",
    provider: "gaga",
    model: "nexus",
    label: "GAGA AI Nexus",
    badge: "Nexus",
    category: "chat",
    description: "GAGA AI Nexus — advanced reasoning model with extended context.",
  },
  // ── Stinger media engines (server-side providers, names are Stinger-branded) ──
  {
    id: "stinger-sonic",
    provider: "music",
    model: "sonic",
    label: "Stinger Sonic",
    badge: "Music",
    category: "music",
    description: "Full song generation with cover art — returns downloadable audio + artwork.",
  },
  {
    id: "stinger-motion",
    provider: "video",
    model: "motion",
    label: "Stinger Motion",
    badge: "Video",
    category: "video",
    description: "Text-to-video with sound and selectable aspect ratio.",
  },
  {
    id: "stinger-vision",
    provider: "image",
    model: "vision",
    label: "Stinger Vision",
    badge: "Image",
    category: "image",
    description: "High fidelity text-to-image with style and aspect ratio control.",
  },
  {
    id: "stinger-forge",
    provider: "image",
    model: "forge",
    label: "Stinger Forge",
    badge: "Image",
    category: "image",
    description: "Precision image engine with width, height and step control.",
  },
  {
    id: "stinger-retouch",
    provider: "image",
    model: "retouch",
    label: "Stinger Retouch",
    badge: "Image edit",
    category: "image",
    description: "Edits an existing image from a prompt.",
  },
];

export const DEFAULT_MODEL_ID = "gaga-ai-nexus";
export const DEFAULT_MUSIC_MODEL_ID = "stinger-sonic";
export const DEFAULT_VIDEO_MODEL_ID = "stinger-motion";
export const DEFAULT_IMAGE_MODEL_ID = "stinger-vision";

/** Maps a media model id to the engine expected by the generate-media function. */
export const IMAGE_ENGINE_BY_MODEL: Record<string, string> = {
  "stinger-vision": "txt2img",
  "stinger-forge": "genimage",
  "stinger-retouch": "genigpt",
};

export function getModelById(id: string): AIModelOption {
  return AI_MODELS.find(m => m.id === id) || AI_MODELS[0];
}

export const MODEL_CATEGORIES = [
  { id: "chat", label: "Chat" },
  { id: "code", label: "Code" },
  { id: "image", label: "Image" },
  { id: "video", label: "Video" },
  { id: "music", label: "Music" },
] as const;
