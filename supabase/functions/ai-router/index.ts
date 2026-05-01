import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Multi-provider AI router. Streams SSE in OpenAI delta format so the existing
 * frontend SSE parser (data: {choices:[{delta:{content}}]} ... [DONE]) keeps working.
 *
 * Body: { provider, model, messages: [{role,content}], stream?: boolean }
 * provider: "lovable" | "openai" | "deepseek" | "anthropic" | "hostify"
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { provider, model, messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return jsonErr("messages required", 400);
    }

    switch (provider) {
      case "lovable":   return await proxyOpenAIShape("https://ai.gateway.lovable.dev/v1/chat/completions", Deno.env.get("LOVABLE_API_KEY"), model || "google/gemini-3-flash-preview", messages);
      case "openai":    return await proxyOpenAIShape("https://api.openai.com/v1/chat/completions",          Deno.env.get("OPENAI_API_KEY"),  model || "gpt-4o-mini",                    messages);
      case "deepseek":  return await proxyOpenAIShape("https://api.deepseek.com/v1/chat/completions",        Deno.env.get("DEEPSEEK_API_KEY"),model || "deepseek-chat",                  messages);
      case "anthropic": return await proxyAnthropic(Deno.env.get("ANTHROPIC_API_KEY"), model || "claude-3-5-sonnet-20241022", messages);
      case "hostify":   return await proxyHostify(model || "letmegpt", messages);
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

/** Encode a content string as a single OpenAI-style SSE delta line + DONE. */
function sseFromText(text: string): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      const chunk = { choices: [{ delta: { content: text } }] };
      controller.enqueue(enc.encode(`data: ${JSON.stringify(chunk)}\n\n`));
      controller.enqueue(enc.encode(`data: [DONE]\n\n`));
      controller.close();
    },
  });
}

/** Direct passthrough of an OpenAI-compatible streaming endpoint. */
async function proxyOpenAIShape(url: string, apiKey: string | undefined, model: string, messages: any[]) {
  if (!apiKey) return jsonErr("API key not configured for this provider", 500);
  const upstream = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, stream: true }),
  });
  if (!upstream.ok) {
    if (upstream.status === 429) return jsonErr("Rate limit exceeded.", 429);
    if (upstream.status === 402) return jsonErr("Credits exhausted.", 402);
    const t = await upstream.text();
    console.error("upstream error", url, upstream.status, t);
    return jsonErr(`Upstream error ${upstream.status}`, 500);
  }
  return new Response(upstream.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
}

/** Anthropic uses a different SSE shape — convert their events to OpenAI deltas. */
async function proxyAnthropic(apiKey: string | undefined, model: string, messages: any[]) {
  if (!apiKey) return jsonErr("ANTHROPIC_API_KEY not configured", 500);
  // Split system out
  const system = messages.filter(m => m.role === "system").map(m => m.content).join("\n\n");
  const userAssistant = messages.filter(m => m.role !== "system");
  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, max_tokens: 4096, system, messages: userAssistant, stream: true }),
  });
  if (!upstream.ok || !upstream.body) {
    const t = await upstream.text().catch(() => "");
    console.error("anthropic error", upstream.status, t);
    return jsonErr(`Anthropic error ${upstream.status}`, 500);
  }

  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const reader = upstream.body.getReader();

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          controller.enqueue(enc.encode(`data: [DONE]\n\n`));
          controller.close();
          return;
        }
        buf += dec.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          const line = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (!json) continue;
          try {
            const evt = JSON.parse(json);
            if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
              const out = { choices: [{ delta: { content: evt.delta.text } }] };
              controller.enqueue(enc.encode(`data: ${JSON.stringify(out)}\n\n`));
            }
          } catch { /* ignore */ }
        }
      }
    },
  });
  return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
}

/** Hostify endpoints: not OpenAI-compatible. We call the simple JSON ones and stream the answer. */
async function proxyHostify(model: string, messages: any[]) {
  // Use the last user message as the prompt
  const lastUser = [...messages].reverse().find(m => m.role === "user")?.content || "";

  let url = "";
  let body: any;
  let extract: (data: any) => string;

  if (model === "letmegpt") {
    url = "https://api.hostify.indevs.in/api/ai/letmegpt";
    body = { message: lastUser };
    extract = (d) => normalizeHostify(d);
  } else if (model === "grok") {
    url = "https://api.hostify.indevs.in/api/ai/grok";
    body = { message: lastUser };
    extract = (d) => normalizeHostify(d);
  } else if (model === "gemini") {
    url = "https://api.hostify.indevs.in/api/ai/gemini";
    body = { prompt: lastUser };
    extract = (d) => normalizeHostify(d);
  } else if (model === "gemini-v2") {
    url = "https://api.hostify.indevs.in/api/ai/gemini-v2";
    body = { prompt: lastUser };
    extract = (d) => normalizeHostify(d);
  } else if (model === "notegpt-deepseek") {
    // notegpt is a streaming SSE endpoint — passthrough but reformat each line
    const upstream = await fetch("https://api.hostify.indevs.in/api/ai/notegpt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: lastUser, model: "TA/deepseek-ai/DeepSeek-R1", chat_mode: "deep_think" }),
    });
    if (!upstream.ok || !upstream.body) return jsonErr(`Hostify error ${upstream.status}`, 500);
    const enc = new TextEncoder();
    const dec = new TextDecoder();
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
            const raw = buf.slice(0, idx).trim();
            buf = buf.slice(idx + 1);
            if (!raw.startsWith("data:")) continue;
            const j = raw.slice(5).trim();
            try {
              const obj = JSON.parse(j);
              const text = obj?.text || obj?.reasoning || "";
              if (text) {
                const out = { choices: [{ delta: { content: text } }] };
                controller.enqueue(enc.encode(`data: ${JSON.stringify(out)}\n\n`));
              }
            } catch { /* ignore */ }
          }
        }
      },
    });
    return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } else {
    return jsonErr(`Unknown Hostify model: ${model}`, 400);
  }

  const upstream = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const raw = await upstream.text();
  let data: any = {};
  try { data = JSON.parse(raw); } catch { /* keep raw */ }
  if (!upstream.ok) {
    console.error("hostify http error", upstream.status, raw.slice(0, 300));
    const text = `⚠️ Hostify upstream returned ${upstream.status}. The Hostify provider is having issues right now. Try another model.`;
    return new Response(sseFromText(text), { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  }
  if (data && data.success === false) {
    const text = `⚠️ Hostify model didn't return an answer (${data.message || "unknown error"}). Try another Hostify model like Grok or Gemini.`;
    return new Response(sseFromText(text), { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  }
  const text = extract(data) || "(empty response)";
  return new Response(sseFromText(text), { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
}

function normalizeHostify(d: any): string {
  if (!d) return "";
  // Common shapes seen across endpoints
  if (typeof d.result === "string") return d.result;
  if (d.result?.answer) return d.result.answer;
  if (d.answer) return d.answer;
  if (d.text) return d.text;
  if (d.response) return d.response;
  if (d.message) return d.message;
  return JSON.stringify(d);
}