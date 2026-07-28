import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/**
 * Private image generation.
 * The upstream endpoint + API key NEVER leave this function — the client only
 * ever receives a base64 data URL of the finished image.
 */
const ENDPOINT = "https://prexzyapis.com/ai/homeplanner-image";

function apiKey() {
  return Deno.env.get("IMAGE_GEN_API_KEY") || Deno.env.get("VIDEO_GEN_API_KEY") || "";
}

async function toDataUrl(res: Response): Promise<string | null> {
  const ctype = res.headers.get("content-type") || "";

  // Direct image buffer
  if (ctype.startsWith("image/")) {
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength < 512) return null;
    let bin = "";
    for (let i = 0; i < buf.length; i += 8192) bin += String.fromCharCode(...buf.subarray(i, i + 8192));
    return `data:${ctype};base64,${btoa(bin)}`;
  }

  const text = await res.text();
  let payload: any = null;
  try { payload = JSON.parse(text); } catch { /* not json */ }

  const candidate: string | undefined =
    payload?.result?.url || payload?.result?.image || payload?.result ||
    payload?.data?.url || payload?.data?.image || payload?.image ||
    payload?.url || payload?.image_url ||
    (typeof payload === "string" ? payload : undefined) ||
    (/^https?:\/\/\S+$/.test(text.trim()) ? text.trim() : undefined);

  if (typeof candidate === "string" && candidate.startsWith("data:image/")) return candidate;
  if (typeof candidate === "string" && /^https?:\/\//.test(candidate)) {
    // Fetch the buffer server-side so the provider URL stays private.
    const img = await fetch(candidate).catch(() => null);
    if (img && img.ok) return await toDataUrl(img);
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt } = await req.json();
    const p = (prompt || "").toString().trim().slice(0, 800);
    if (!p) return json({ error: "Prompt is required" }, 400);

    const key = apiKey();
    const attempts: Array<() => Promise<Response | null>> = [
      () => fetch(`${ENDPOINT}?prompt=${encodeURIComponent(p)}&apikey=${encodeURIComponent(key)}`).catch(() => null),
      () => fetch(`${ENDPOINT}?prompt=${encodeURIComponent(p)}&apiKey=${encodeURIComponent(key)}`).catch(() => null),
      () => fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, "x-api-key": key },
        body: JSON.stringify({ prompt: p, apikey: key }),
      }).catch(() => null),
    ];

    for (const attempt of attempts) {
      const res = await attempt();
      if (!res || !res.ok) continue;
      const dataUrl = await toDataUrl(res.clone()).catch(() => null);
      if (dataUrl) return json({ image: dataUrl });
    }

    return json({ error: "Image provider did not return an image. Please try a different prompt." }, 502);
  } catch (e) {
    console.error("generate-image error", e);
    return json({ error: (e as Error).message || "Image generation failed" }, 500);
  }
});