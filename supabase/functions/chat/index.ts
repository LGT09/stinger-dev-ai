import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SYSTEM = `You are Stinger AI, a powerful AI assistant for software development running on Stinger AI Dev.
You help users generate code, build apps, create APIs, design databases and more.
Write clean, production-ready code and format code blocks with language tags.`;

/**
 * Thin compatibility shim — every request is served by the Stinger AI router
 * (Hostify + GAGA AI Nexus). No Lovable AI is used anywhere.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, model, modalities, mode } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Image requests go to the private Stinger image engine.
    if (modalities?.includes("image")) {
      const prompt = [...messages].reverse().find((m: any) => m.role === "user")?.content || "";
      const r = await fetch(`${SUPABASE_URL}/functions/v1/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
        body: JSON.stringify({ prompt }),
      });
      const data = await r.json().catch(() => ({ error: "Image engine error" }));
      return new Response(JSON.stringify(data), {
        status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const r = await fetch(`${SUPABASE_URL}/functions/v1/ai-router`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
      body: JSON.stringify({
        provider: model === "hostify-ai" ? "hostify" : "gaga",
        model: model || "gaga-ai-nexus",
        mode,
        messages: [{ role: "system", content: SYSTEM }, ...messages],
      }),
    });

    if (!r.ok || !r.body) {
      const t = await r.text().catch(() => "");
      console.error("ai-router error", r.status, t.slice(0, 200));
      return new Response(JSON.stringify({ error: "Stinger AI is unavailable right now" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(r.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
