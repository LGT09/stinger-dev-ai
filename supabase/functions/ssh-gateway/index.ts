import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-stinger-key",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const MODELS = ["gaga-ai-nexus", "hostify-ai", "music-suno", "music-mubert"];

/**
 * ssh-gateway — Stinger SSH.
 * Authenticates a terminal session with a Stinger SSH key (sk_live_… , 1440 min TTL)
 * and runs platform commands remotely: prompt the AI, switch models, list/read
 * projects, deploy sites and inspect builds.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const rawKey: string = body.key || req.headers.get("x-stinger-key") || "";
    if (!rawKey) return json({ error: "Missing Stinger SSH key" }, 401);

    const prefix = rawKey.slice(0, 12);
    const hash = await sha256(rawKey);
    const { data: keyRow } = await admin.from("project_ssh_keys")
      .select("*").eq("key_prefix", prefix).eq("key_hash", hash).maybeSingle();

    if (!keyRow) return json({ error: "Invalid SSH key" }, 401);
    if (keyRow.revoked) return json({ error: "This SSH key has been revoked" }, 403);
    if (new Date(keyRow.expires_at) < new Date()) return json({ error: "SSH key expired (keys live for 1440 minutes)" }, 403);

    await admin.from("project_ssh_keys").update({
      last_used_at: new Date().toISOString(),
      uses: (keyRow.uses || 0) + 1,
      last_ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      last_device: (req.headers.get("user-agent") || "").slice(0, 160) || null,
    }).eq("id", keyRow.id);

    const scopes: string[] = keyRow.scopes || [];
    const need = (s: string) => scopes.includes(s);
    const command: string = (body.command || "help").trim();
    const args = body.args || {};
    const uid = keyRow.user_id;

    switch (command) {
      case "help":
        return json({ ok: true, output: HELP, commands: Object.keys(HELP_MAP), scopes, expires_at: keyRow.expires_at });

      case "whoami": {
        const { data: p } = await admin.from("profiles").select("display_name, email, referral_code").eq("user_id", uid).maybeSingle();
        const { data: t } = await admin.from("token_balances").select("balance").eq("user_id", uid).maybeSingle();
        return json({ ok: true, user: p, tokens: t?.balance ?? 0, key: keyRow.label, expires_at: keyRow.expires_at });
      }

      case "models":
        return json({ ok: true, models: MODELS, active: args.project_id ? undefined : MODELS[0] });

      case "model": {
        if (!need("models")) return json({ error: "Key lacks the 'models' scope" }, 403);
        const model = String(args.model || "");
        if (!MODELS.includes(model)) return json({ error: `Unknown model. Available: ${MODELS.join(", ")}` }, 400);
        await admin.from("project_ssh_keys").update({ label: keyRow.label }).eq("id", keyRow.id);
        return json({ ok: true, output: `Model switched to ${model}`, model });
      }

      case "projects": {
        const { data } = await admin.from("projects").select("id, name, language, updated_at")
          .eq("user_id", uid).order("updated_at", { ascending: false }).limit(50);
        return json({ ok: true, projects: data || [] });
      }

      case "cat": {
        if (!need("files")) return json({ error: "Key lacks the 'files' scope" }, 403);
        const { data } = await admin.from("projects").select("name, code_content").eq("id", args.project_id).eq("user_id", uid).maybeSingle();
        if (!data) return json({ error: "Project not found" }, 404);
        return json({ ok: true, name: data.name, content: data.code_content || "" });
      }

      case "builds": {
        const { data } = await admin.from("apk_builds").select("id, target, status, progress, stage, apk_url, created_at")
          .eq("user_id", uid).order("created_at", { ascending: false }).limit(10);
        return json({ ok: true, builds: data || [] });
      }

      case "prompt":
      case "chat": {
        if (!need("chat")) return json({ error: "Key lacks the 'chat' scope" }, 403);
        const model = String(args.model || "gaga-ai-nexus");
        const provider = model.startsWith("music") ? "music" : model === "hostify-ai" ? "hostify" : "gaga";
        const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-router`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({
            provider, model, mode: args.mode || "chat",
            messages: [{ role: "user", content: String(args.prompt || body.prompt || "") }],
          }),
        });
        const text = await res.text();
        if (!res.ok) return json({ error: `AI request failed [${res.status}]: ${text}` }, res.status);
        return json({ ok: true, model, output: parseSSE(text) });
      }

      case "deploy": {
        if (!need("deploy")) return json({ error: "Key lacks the 'deploy' scope" }, 403);
        const { data: project } = await admin.from("projects").select("*").eq("id", args.project_id).eq("user_id", uid).maybeSingle();
        if (!project) return json({ error: "Project not found" }, 404);
        const { data: prof } = await admin.from("profiles").select("display_name, email").eq("user_id", uid).maybeSingle();
        const username = slug((prof?.email || "user").split("@")[0]);
        const site = slug(args.name || project.name);
        const { data: taken } = await admin.from("deployments").select("project_id").eq("username", username).eq("slug", site).maybeSingle();
        if (taken && taken.project_id !== project.id) return json({ error: `"${site}" is already taken` }, 409);
        const url = `https://stinger.co.zw/${username}/${site}`;
        const { error } = await admin.from("deployments").upsert({
          user_id: uid, project_id: project.id, username, slug: site, title: args.name || project.name,
          status: "live", url, logs: [`[${new Date().toISOString()}] Deployed from Stinger SSH`],
        }, { onConflict: "username,slug" });
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true, output: `Deployed → /${username}/${site}`, url, path: `/${username}/${site}` });
      }

      case "revoke":
        await admin.from("project_ssh_keys").update({ revoked: true }).eq("id", keyRow.id);
        return json({ ok: true, output: "This key has been revoked. Generate a new one from the Stinger SSH page." });

      default:
        return json({ error: `Unknown command "${command}". Run 'help'.` }, 400);
    }
  } catch (e: any) {
    console.error("ssh-gateway error", e);
    return json({ error: e?.message || "Server error" }, 500);
  }
});

const HELP_MAP: Record<string, string> = {
  help: "Show this help",
  whoami: "Show account, token balance and key expiry",
  models: "List available AI models",
  "model --model <id>": "Switch the active AI model",
  "prompt --prompt \"...\"": "Talk to the Stinger AI",
  projects: "List your projects",
  "cat --project_id <id>": "Print a project's source",
  "deploy --project_id <id> [--name x]": "Deploy a project as a live site",
  builds: "List recent app builds",
  revoke: "Revoke this key immediately",
};
const HELP = Object.entries(HELP_MAP).map(([c, d]) => `  ${c.padEnd(38)} ${d}`).join("\n");

function json(b: any, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function slug(s: string) { return (s || "app").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "app"; }
async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
/** Collapse the router's SSE stream into plain text. */
function parseSSE(raw: string) {
  if (!raw.includes("data:")) return raw;
  let out = "";
  for (const l of raw.split("\n")) {
    if (!l.startsWith("data:")) continue;
    const d = l.slice(5).trim();
    if (!d || d === "[DONE]") continue;
    try { out += JSON.parse(d)?.choices?.[0]?.delta?.content || ""; } catch { /* ignore */ }
  }
  return out || raw;
}
