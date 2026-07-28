import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/**
 * Voice note transcription. Accepts { audio: "<base64>", mime: "audio/webm" }
 * and returns { text }.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { audio, mime } = await req.json();
    if (!audio) return json({ error: "No audio provided" }, 400);

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "Transcription is not configured" }, 500);

    const format = (mime || "audio/webm").split("/")[1]?.split(";")[0] || "webm";

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Transcribe the user's audio verbatim. Reply with the transcript only — no commentary, no quotes." },
          {
            role: "user",
            content: [
              { type: "text", text: "Transcribe this voice note." },
              { type: "input_audio", input_audio: { data: audio, format } },
            ],
          },
        ],
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return json({ error: data?.error?.message || `Transcription failed (${res.status})` }, res.status);
    }

    const text = data?.choices?.[0]?.message?.content?.toString().trim() || "";
    if (!text) return json({ error: "Could not hear anything in that recording." }, 422);
    return json({ text });
  } catch (e) {
    console.error("voice-transcribe error", e);
    return json({ error: (e as Error).message || "Transcription failed" }, 500);
  }
});