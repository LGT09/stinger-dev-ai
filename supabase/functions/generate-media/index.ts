import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Unified Stinger media generation endpoint.
 *  kind: "video" | "song" | "image"
 *  prompt: string
 *  video:  aspectRatio ("16:9" | "9:16" | "1:1" | "auto"), sound (bool)
 *  song:   style?, lyrics?
 *  image:  engine ("txt2img" | "genimage"), style?, aspectRatio?, width?, height?, steps?, image? (edit source)
 *
 * Response: { kind, url, coverUrl?, tracks?, mime, meta }
 * Provider endpoints stay server-side only.
 */
const OMEGA = "https://omegatech-api.dixonomega.tech/api/ai";
const PREXZY = "https://prexzyapis.com/ai";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function getJson(url: string, ms = 170000): Promise<any | null> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    const txt = await r.text();
    try { return JSON.parse(txt); } catch { return null; }
  } catch (e) {
    console.error("upstream failed", url.split("?")[0], e);
    return null;
  } finally { clearTimeout(t); }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const kind = body.kind as "video" | "song" | "image";
    const prompt = (body.prompt || "").toString().slice(0, 1000).trim();
    if (!prompt) return json({ error: "Prompt is required" }, 400);

    if (kind === "video") {
      const ratio = body.aspectRatio && body.aspectRatio !== "auto" ? body.aspectRatio : "auto";
      const sound = body.sound === false ? "false" : "true";
      const url = `${OMEGA}/Txt2video?action=generate&prompt=${encodeURIComponent(prompt)}&ratio=${encodeURIComponent(ratio)}&sound=${sound}`;
      const j = await getJson(url);
      const videoUrl = j?.data?.videoUrl || j?.videoUrl || j?.url || null;
      if (!videoUrl) {
        return json({ kind: "video", url: null, queued: true, message: "Stinger Motion is busy — try again in a moment." });
      }
      return json({ kind: "video", url: videoUrl, mime: "video/mp4", meta: { ratio, sound: sound === "true", prompt } });
    }

    if (kind === "song") {
      const style = (body.style || "").toString();
      const full = style ? `${prompt} (${style})` : prompt;
      const j = await getJson(`${OMEGA}/sonu4?action=generate&prompt=${encodeURIComponent(full)}`);
      const tracks = (j?.data?.tracks || []).map((t: any) => ({
        title: t.title || j?.data?.title || "Untitled",
        audioUrl: t.audioUrl || null,
        coverUrl: t.imageUrl || null,
        videoUrl: t.videoUrl || null,
      })).filter((t: any) => t.audioUrl);
      if (!tracks.length) {
        return json({ kind: "song", url: null, queued: true, message: "Stinger Sonic is busy — try again in a moment." });
      }
      return json({
        kind: "song",
        url: tracks[0].audioUrl,
        coverUrl: tracks[0].coverUrl,
        tracks,
        mime: "audio/mpeg",
        meta: { title: j?.data?.title || prompt, style, prompt },
      });
    }

    if (kind === "image") {
      const engine = body.engine === "genimage" ? "genimage" : body.image ? "genigpt" : "txt2img";
      let url: string;
      if (engine === "genimage") {
        const w = Math.min(Math.max(Number(body.width) || 1024, 256), 1920);
        const h = Math.min(Math.max(Number(body.height) || 1024, 256), 1920);
        const steps = Math.min(Math.max(Number(body.steps) || 25, 1), 50);
        url = `${PREXZY}/genimage?prompt=${encodeURIComponent(prompt)}&width=${w}&height=${h}&steps=${steps}`;
      } else if (engine === "genigpt") {
        url = `${PREXZY}/genigpt?prompt=${encodeURIComponent(prompt)}&image=${encodeURIComponent(body.image)}`;
      } else {
        const style = body.style ? `&style=${encodeURIComponent(body.style)}` : "";
        const ar = body.aspectRatio ? `&aspect_ratio=${encodeURIComponent(body.aspectRatio)}` : "";
        const model = body.model ? `&model=${encodeURIComponent(body.model)}` : "";
        url = `${PREXZY}/txt2img?prompt=${encodeURIComponent(prompt)}${model}${style}${ar}`;
      }
      const j = await getJson(url, 120000);
      const imageUrl = j?.image_url || j?.url || j?.data?.image_url || j?.result || null;
      if (!imageUrl) return json({ kind: "image", url: null, queued: true, message: "Stinger Vision is busy — try again." });
      return json({ kind: "image", url: imageUrl, mime: "image/png", meta: { engine, prompt } });
    }

    return json({ error: "kind must be 'video', 'song' or 'image'" }, 400);
  } catch (e: any) {
    console.error("generate-media error:", e);
    return json({ error: e?.message || "Unknown error" }, 500);
  }
});
