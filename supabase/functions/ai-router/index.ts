import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Multi-provider AI router. Streams SSE in OpenAI delta shape. */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { provider, model, messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) return jsonErr("messages required", 400);

    switch (provider) {
      case "deepseek":  return await proxyOpenAIShape("https://api.deepseek.com/v1/chat/completions", Deno.env.get("DEEPSEEK_API_KEY"), model || "deepseek-chat", messages);
      case "anthropic": return await proxyAnthropic(Deno.env.get("ANTHROPIC_API_KEY"), model || "claude-3-5-sonnet-20241022", messages);
      case "davidcyril": return await proxyDavidCyril(model, messages);
      case "music":     return await proxyMusic(model, messages);
      default:          return jsonErr(`Unknown provider: ${provider}`, 400);
    }
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
      // Stream in chunks for a typing effect
      const chunks = text.match(/.{1,40}/gs) || [text];
      let i = 0;
      const push = () => {
        if (i >= chunks.length) {
          c.enqueue(enc.encode(`data: [DONE]\n\n`));
          c.close();
          return;
        }
        c.enqueue(enc.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: chunks[i++] } }] })}\n\n`));
        setTimeout(push, 15);
      };
      push();
    },
  });
  return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
}

async function proxyOpenAIShape(url: string, apiKey: string | undefined, model: string, messages: any[]) {
  if (!apiKey) return jsonErr("API key not configured for this provider", 500);
  const upstream = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, stream: true }),
  });
  if (!upstream.ok) {
    const t = await upstream.text();
    let msg = `Upstream ${upstream.status}`;
    try { const j = JSON.parse(t); if (j?.error?.message) msg = j.error.message; } catch {}
    if (upstream.status === 429) msg = `Rate limit — switch model.`;
    if (upstream.status === 402) msg = `Credits exhausted on this provider.`;
    return jsonErr(msg, upstream.status);
  }
  return new Response(upstream.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
}

async function proxyAnthropic(apiKey: string | undefined, model: string, messages: any[]) {
  if (!apiKey) return jsonErr("ANTHROPIC_API_KEY not configured", 500);
  const system = messages.filter(m => m.role === "system").map(m => m.content).join("\n\n");
  const userAssistant = messages.filter(m => m.role !== "system");
  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({ model, max_tokens: 4096, system, messages: userAssistant, stream: true }),
  });
  if (!upstream.ok || !upstream.body) {
    const t = await upstream.text().catch(() => "");
    let msg = `Anthropic ${upstream.status}`;
    try { const j = JSON.parse(t); if (j?.error?.message) msg = j.error.message; } catch {}
    return jsonErr(msg, 500);
  }
  const enc = new TextEncoder(), dec = new TextDecoder();
  const reader = upstream.body.getReader();
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) { controller.enqueue(enc.encode(`data: [DONE]\n\n`)); controller.close(); return; }
        buf += dec.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          const line = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 1);
          if (!line.startsWith("data: ")) continue;
          try {
            const evt = JSON.parse(line.slice(6).trim());
            if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
              controller.enqueue(enc.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: evt.delta.text } }] })}\n\n`));
            }
          } catch {}
        }
      }
    },
  });
  return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
}

/** davidcyril.name.ng AI endpoints — simple GET ?text= or ?prompt=, returns {success,response} */
const DC_PARAM: Record<string, "text" | "prompt"> = {
  "claude": "text", "claudeSonnet": "text", "chatgpt": "prompt", "gpt44": "text",
  "gpt4omini": "text", "google-gemini": "prompt", "gemini": "text", "gemma": "text",
  "deepseek-v3": "text", "deepseek-r1": "text", "deepseek-llm-67b-chat": "text",
  "qwen2Coder": "prompt", "llamacoder": "prompt", "copilot": "text", "perplexity": "text", "g4f-groq": "text",
};

async function proxyDavidCyril(model: string, messages: any[]) {
  const last = [...messages].reverse().find(m => m.role === "user")?.content || "";
  const sys = messages.filter(m => m.role === "system").map(m => m.content).join("\n");
  const fullPrompt = sys ? `${sys}\n\nUser: ${last}` : last;
  const param = DC_PARAM[model] || "text";
  const url = `https://apis.davidcyril.name.ng/ai/${model}?${param}=${encodeURIComponent(fullPrompt)}`;
  try {
    const res = await fetch(url, { method: "GET" });
    const txt = await res.text();
    let data: any = {};
    try { data = JSON.parse(txt); } catch {}
    if (!res.ok || data?.success === false) {
      return sseFromText(`⚠️ ${model} unavailable right now (${data?.message || res.status}). Try a different model.`);
    }
    const out = data?.response || data?.result || data?.answer || data?.message || txt;
    return sseFromText(typeof out === "string" ? out : JSON.stringify(out));
  } catch (e: any) {
    return sseFromText(`⚠️ Network error contacting ${model}: ${e.message}`);
  }
}

/** Music generation: model = "suno" | "mubert" — returns a text confirmation with audio URL */
async function proxyMusic(model: string, messages: any[]) {
  const prompt = [...messages].reverse().find(m => m.role === "user")?.content || "";
  if (model === "mubert") {
    try {
      const r = await fetch(`https://apis.davidcyril.name.ng/aimusic/mubert/create?prompt=${encodeURIComponent(prompt)}`);
      const j = await r.json().catch(() => ({}));
      const url = j?.response?.url || j?.url || j?.audio || j?.result;
      if (!url) return sseFromText(`⏳ Mubert queued: ${j?.message || "no URL yet"}. Try again in a moment.`);
      return sseFromText(`✅ **Mubert track ready!**\n\n<audio src="${url}" controls style="width:100%"></audio>\n\n[Download](${url})`);
    } catch (e: any) { return sseFromText(`⚠️ Mubert error: ${e.message}`); }
  }
  if (model === "suno") {
    try {
      const r = await fetch(`https://apis.davidcyril.name.ng/aimusic/suno/create?prompt=${encodeURIComponent(prompt)}`);
      const j = await r.json().catch(() => ({}));
      const url = j?.response?.audio_url || j?.audio_url || j?.url;
      if (!url) return sseFromText(`⏳ Suno queued: ${j?.message || "no URL yet"}. Check back shortly.`);
      return sseFromText(`✅ **Suno song ready!**\n\n<audio src="${url}" controls style="width:100%"></audio>\n\n[Download](${url})`);
    } catch (e: any) { return sseFromText(`⚠️ Suno error: ${e.message}`); }
  }
  return jsonErr(`Unknown music model: ${model}`, 400);
}
