import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Stinger AI router — NO Lovable AI. Everything runs on the provided
 * Stinger endpoints/keys: Hostify (grok → gemini → deepseek) and
 * GAGA AI Nexus (Hyperbolic-compatible, GAGA_AI_NEXUS_API_KEY).
 */
const HOSTIFY_ENDPOINTS = [
  "https://api.hostify.co.zw/api/ai/grok",
  "https://api.hostify.co.zw/api/ai/gemini",
  "https://api.hostify.co.zw/api/ai/deepseek",
];

const GAGA_KEY = Deno.env.get("GAGA_AI_NEXUS_API_KEY");
const GAGA_ENDPOINT = "https://api.hyperbolic.xyz/v1/chat/completions";
const GAGA_MODEL = "meta-llama/Meta-Llama-3.1-70B-Instruct";

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
    if (provider === "gaga") return await proxyGaga(messages, mode);
    return await proxyHostify(messages, mode);
  } catch (e: any) {
    console.error("ai-router error:", e);
    return jsonErr(e?.message || "Unknown error", 500);
  }
});

function jsonErr(error: string, status: number) {
  return new Response(JSON.stringify({ error }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function sseFromText(textIn: any): Response {
  const text = typeof textIn === "string" ? textIn : JSON.stringify(textIn ?? "");
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    start(c) {
      const chunks = (text || " ").match(/.{1,40}/gs) || [text || " "];
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
    const post = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, model: url.split("/").pop(), chat_mode: "default" }),
    }).catch(() => null);
    if (post && post.ok) {
      const out = extractText(await post.text());
      if (out) return out;
    }
    const get = await fetch(`${url}?prompt=${encodeURIComponent(prompt)}`).catch(() => null);
    if (get && get.ok) {
      const out = extractText(await get.text());
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
    const cand =
      j.response?.answer || j.response?.text || j.response?.message || j.response ||
      j.result || j.answer || j.message || j.text ||
      j.data?.response || j.data?.answer || j.data?.text;
    if (cand == null) return typeof j === "string" ? j : null;
    return typeof cand === "string" ? cand : JSON.stringify(cand);
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
  // Last resort: GAGA Nexus (still a Stinger-provided key, never Lovable AI).
  const gaga = await gagaOnce(messages, mode);
  if (gaga) return gaga;
  return sseFromText("⚠️ Stinger AI endpoints are unreachable right now. Please retry in a moment.");
}

async function gagaOnce(messages: any[], mode?: string): Promise<Response | null> {
  if (!GAGA_KEY) return null;
  const sys = mode === "code" ? [{ role: "system", content: CODE_SYSTEM }] : [];
  try {
    const r = await fetch(GAGA_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${GAGA_KEY}` },
      body: JSON.stringify({ model: GAGA_MODEL, messages: [...sys, ...messages], stream: true, max_tokens: 4096 }),
    });
    if (r.ok && r.body) return new Response(r.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
    console.error("GAGA error", r.status, (await r.text()).slice(0, 200));
  } catch (e) { console.error("GAGA failed", e); }
  return null;
}

async function proxyGaga(messages: any[], mode?: string) {
  const branded = [
    { role: "system", content: "You are GAGA AI Nexus, an advanced reasoning model built into Stinger AI Dev. Identify as GAGA AI Nexus when asked." },
    ...messages,
  ];
  const r = await gagaOnce(branded, mode);
  if (r) return r;
  // Fall back onto Hostify (Stinger-provided too).
  const prompt = buildPrompt(branded, mode);
  for (const url of HOSTIFY_ENDPOINTS) {
    const text = await tryHostify(url, prompt);
    if (text) return sseFromText(text);
  }
  return sseFromText("⚠️ GAGA AI Nexus is unreachable right now. Please retry in a moment.");
}

async function proxyMusic(model: string, messages: any[]) {
  const prompt = [...messages].reverse().find(m => m.role === "user")?.content || "";
  try {
    const r = await fetch(`https://omegatech-api.dixonomega.tech/api/ai/sonu4?prompt=${encodeURIComponent(prompt)}`);
    const j = await r.json().catch(() => ({} as any));
    const url = j?.result?.audio_url || j?.response?.audio_url || j?.audio_url || j?.url;
    if (!url) return sseFromText(`⏳ Stinger Sonic queued: ${j?.message || "no URL yet"}. Try again shortly.`);
    return sseFromText(`✅ **Track ready!**\n\n<audio src="${url}" controls style="width:100%"></audio>\n\n[Download](${url})`);
  } catch (e: any) {
    return sseFromText(`⚠️ Music engine error: ${e.message}`);
  }
}
