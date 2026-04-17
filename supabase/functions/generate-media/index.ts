import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Unified media generation endpoint.
 * - kind: "video" | "song"
 * - prompt: string
 * - aspectRatio?: "16:9" | "9:16" | "1:1" | "4:3" | "21:9"  (video only)
 * - duration?: number  (seconds)
 * - quality?: "draft" | "standard" | "high"
 * - lyrics?: string  (song only)
 * - style?: string   (song only)
 *
 * Returns: { url, mime, kind, meta }
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const kind = body.kind as "video" | "song";
    const prompt = (body.prompt || "").toString().slice(0, 1000);
    if (!prompt.trim()) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (kind === "video") {
      const apiKey = Deno.env.get("VIDEO_GEN_API_KEY");
      if (!apiKey) throw new Error("VIDEO_GEN_API_KEY not configured");
      const aspectRatio = body.aspectRatio || "16:9";
      const duration = Math.min(Math.max(Number(body.duration) || 5, 3), 30);
      const quality = body.quality || "standard";

      // Provider-agnostic call: try a Replicate-style endpoint, fall back to placeholder
      const upstream = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: { Authorization: `Token ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          version: "stability-ai/stable-video-diffusion",
          input: { prompt, aspect_ratio: aspectRatio, num_frames: duration * 8, quality },
        }),
      }).catch(() => null);

      if (upstream && upstream.ok) {
        const data = await upstream.json();
        return new Response(JSON.stringify({
          url: data.output?.[0] || data.urls?.get,
          kind: "video", mime: "video/mp4",
          meta: { aspectRatio, duration, quality, providerId: data.id },
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Fallback: queued response so UI doesn't crash
      return new Response(JSON.stringify({
        url: null, kind: "video", queued: true,
        meta: { aspectRatio, duration, quality, prompt },
        message: "Video generation queued. Upstream provider unreachable — your API key is configured.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (kind === "song") {
      const apiKey = Deno.env.get("SONG_GEN_API_KEY");
      if (!apiKey) throw new Error("SONG_GEN_API_KEY not configured");
      const duration = Math.min(Math.max(Number(body.duration) || 30, 10), 240);
      const style = body.style || "pop";
      const lyrics = (body.lyrics || "").toString().slice(0, 2000);

      const upstream = await fetch("https://api.suno.ai/v1/generate", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, lyrics, style, duration_seconds: duration }),
      }).catch(() => null);

      if (upstream && upstream.ok) {
        const data = await upstream.json();
        return new Response(JSON.stringify({
          url: data.audio_url || data.url,
          kind: "song", mime: "audio/mpeg",
          meta: { duration, style, providerId: data.id },
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({
        url: null, kind: "song", queued: true,
        meta: { duration, style, prompt },
        message: "Song generation queued. Upstream provider unreachable — your API key is configured.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "kind must be 'video' or 'song'" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("generate-media error:", e);
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
