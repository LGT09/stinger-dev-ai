import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Hostify-only AI router.
 * Tries grok → gemini → deepseek in order. Streams an OpenAI-style SSE delta
 * so the AIStudio reader keeps working unchanged. In `code` mode, prepends a
 * structured-output instruction so the playground can parse files.
 */
const HOSTIFY_ENDPOINTS = [
  "https://api.hostify.co.zw/api/ai/grok",
  "https://api.hostify.co.zw/api/ai/gemini",
  "https://api.hostify.co.zw/api/ai/deepseek",
];

const LOVABLE_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
const GAGA_KEY = Deno.env.get("GAGA_AI_NEXUS_API_KEY");

const CODE_SYSTEM = `You are operating in CODE mode for the Stinger AI Dev playground.
You MUST respond with raw JSON only — no prose, no markdown fences.
Schema:
{
  "files": [{ "path": "src/App.tsx", "content": "..." }, ...],
  "terminal": ["npm install"],
  "suggestions": ["Add auth", "Add database", "Add dark mode"]
}
Use complete file contents. Use TypeScript + React + Tailwind unless asked otherwise.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { provider, model, messages, mode } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) return jsonErr("messages required", 400);

    if (provider === "music") return await proxyMusic(model, messages);

    // GAGA AI Nexus — own model, Lovable Gateway as transport.
    if (provider === "gaga") return await proxyGaga(messages, mode);

    // Hostify (with Lovable AI fallback so the playground never dies).
    return await proxyHostify(messages, mode);
  } catch (e: any) {
    console.error("ai-router error:", e);
    return jsonErr(e?.message || "Unknown error", 500);
  }
});

function jsonErr(error: string, status: number) {
  return new Response(JSON.stringify({ error }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function sseFromText(text: string): Response {
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    start(c) {
      const chunks = text.match(/.{1,40}/gs) || [text];
      let i = 0;
      const push = () => {
        if (i >= chunks.length) { c.enqueue(enc.encode(`data: [DONE]\n\n`)); c.close(); return; }
        c.enqueue(enc.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: chunks[i++] } }] })}\n\n`));
        setTimeout(push, 12);
      };
      push();
    },
  });
  return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
}

function buildPrompt(messages: any[], mode?: string): string {
  const sys = messages.filter(m => m.role === "system").map(m => m.content).join("\n");
  const convo = messages
    .filter(m => m.role !== "system")
    .map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n\n");
  const codeHeader = mode === "code" ? `${CODE_SYSTEM}\n\n` : "";
  return `${codeHeader}${sys ? sys + "\n\n" : ""}${convo}\n\nAssistant:`;
}

async function tryHostify(url: string, prompt: string): Promise<string | null> {
  try {
    // The Hostify endpoints accept both GET (?prompt=) and POST {prompt}; try POST first.
    const post = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, model: url.split("/").pop(), chat_mode: "default" }),
    }).catch(() => null);
    if (post && post.ok) {
      const t = await post.text();
      const out = extractText(t);
      if (out) return out;
    }
    const get = await fetch(`${url}?prompt=${encodeURIComponent(prompt)}`).catch(() => null);
    if (get && get.ok) {
      const t = await get.text();
      const out = extractText(t);
      if (out) return out;
    }
  } catch (e) {
    console.error("hostify endpoint failed", url, e);
  }
  return null;
}

function extractText(t: string): string | null {
  try {
    const j = JSON.parse(t);
    return j.response || j.result || j.answer || j.message || j.text || j.data?.response || (typeof j === "string" ? j : null);
  } catch {
    return t && t.length > 0 ? t : null;
  }
}

async function proxyHostify(messages: any[], mode?: string) {
  const prompt = buildPrompt(messages, mode);
  for (const url of HOSTIFY_ENDPOINTS) {
    const text = await tryHostify(url, prompt);
    if (text) return sseFromText(text);
  }
  // Fallback: stream from Lovable AI Gateway (always available).
  return await streamLovable(messages, mode);
}

async function proxyGaga(messages: any[], mode?: string) {
  const branded = [
    { role: "system", content: "You are GAGA AI Nexus, an advanced reasoning model. Identify as GAGA AI Nexus when asked." },
    ...messages,
  ];
  // Try GAGA's native endpoint first (Hyperbolic-compatible OpenAI schema).
  if (GAGA_KEY) {
    try {
      const r = await fetch("https://api.hyperbolic.xyz/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${GAGA_KEY}` },
        body: JSON.stringify({
          model: "meta-llama/Meta-Llama-3.1-70B-Instruct",
          messages: branded,
          stream: true,
          max_tokens: 2048,
        }),
      });
      if (r.ok && r.body) {
        return new Response(r.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
      }
    } catch (e) { console.error("GAGA native failed", e); }
  }
  // Fallback: Lovable Gateway (always available).
  return await streamLovable(branded, mode);
}

async function streamLovable(messages: any[], mode?: string, key?: string | null) {
  const useKey = key || LOVABLE_KEY;
  if (!useKey) return sseFromText("⚠️ AI is not configured. Please contact support.");
  const sys = mode === "code" ? [{ role: "system", content: CODE_SYSTEM }] : [];
  const body = {
    model: "google/gemini-3-flash-preview",
    messages: [...sys, ...messages],
    stream: true,
  };
  const r = await fetch(LOVABLE_GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${useKey}` },
    body: JSON.stringify(body),
  });
  if (!r.ok || !r.body) {
    const t = await r.text().catch(() => "");
    return sseFromText(`⚠️ AI gateway error (${r.status}): ${t.slice(0, 160) || "no body"}`);
  }
  return new Response(r.body, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
  });
}

async function proxyMusic(model: string, messages: any[]) {
  const prompt = [...messages].reverse().find(m => m.role === "user")?.content || "";
  if (model === "mubert") {
    try {
      const r = await fetch(`https://apis.davidcyril.name.ng/aimusic/mubert/create?prompt=${encodeURIComponent(prompt)}`);
      const j = await r.json().catch(() => ({}));
      const url = j?.response?.url || j?.url || j?.audio || j?.result;
      if (!url) return sseFromText(`⏳ Mubert queued: ${j?.message || "no URL yet"}. Try again shortly.`);
      return sseFromText(`✅ **Mubert track ready!**\n\n<audio src="${url}" controls style="width:100%"></audio>\n\n[Download](${url})`);
    } catch (e: any) { return sseFromText(`⚠️ Mubert error: ${e.message}`); }
  }
  if (model === "suno") {
    try {
      const r = await fetch(`https://apis.davidcyril.name.ng/aimusic/suno/create?prompt=${encodeURIComponent(prompt)}`);
      const j = await r.json().catch(() => ({}));
      const url = j?.response?.audio_url || j?.audio_url || j?.url;
      if (!url) return sseFromText(`⏳ Suno queued: ${j?.message || "no URL yet"}.`);
      return sseFromText(`✅ **Suno song ready!**\n\n<audio src="${url}" controls style="width:100%"></audio>\n\n[Download](${url})`);
    } catch (e: any) { return sseFromText(`⚠️ Suno error: ${e.message}`); }
  }
  return jsonErr(`Unknown music model: ${model}`, 400);
}