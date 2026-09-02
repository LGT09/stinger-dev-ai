import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-stinger-key",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY);

/**
 * Truecolor ANSI painters (chalk-style output without the npm dependency,
 * which does not initialise inside the Deno edge runtime).
 */
const paint = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return (s: string) => `\u001b[38;2;${r};${g};${b}m${s}\u001b[0m`;
};
const gold = paint("#ffd400");
const neon = paint("#00f0ff");
const dim = paint("#7a8590");
const ok = paint("#4ade80");
const bad = paint("#f87171");


/** Chalk-rendered Stinger hornet mark — gold body, neon bolt. */
const LOGO = [
  gold("      ╔══════════════════════════════════════╗"),
  gold("      ║") + neon("   ▄▄   ") + gold("╱╲") + neon("   ▄▄   ") + gold("  ⚡  S T I N G E R ") + gold("║"),
  gold("      ║") + neon("  ▐██▌ ") + gold("╱  ╲") + neon(" ▐██▌  ") + dim("   A I   D E V     ") + gold("║"),
  gold("      ║") + gold("   ╲█████████████╱     ") + neon("<  />") + gold("        ║"),
  gold("      ║") + gold("     ╲█████████╱       ") + dim("stinger.co.zw") + gold("   ║"),
  gold("      ║") + neon("        ╲███╱          ") + dim("built by Traxxion") + gold(" ║"),
  gold("      ╚══════════════════════════════════════╝"),
].join("\n");

const MODELS = ["gaga-ai-nexus", "hostify-ai"];

const menu = (isAdminKey: boolean) => [
  "",
  LOGO,
  "",
  neon("  Select an activity:"),
  `   ${gold("1")} ${"prompt"}    ${dim("— talk to Stinger AI / code / build")}`,
  `   ${gold("2")} ${"projects"}  ${dim("— list your projects")}`,
  `   ${gold("3")} ${"open"}      ${dim("— enter a project workspace (its own tab of tools)")}`,
  `   ${gold("4")} ${"deploy"}    ${dim("— publish a project and get back a live URL")}`,
  `   ${gold("5")} ${"builds"}    ${dim("— recent app builds")}`,
  `   ${gold("6")} ${"models"}    ${dim("— list / switch AI models")}`,
  `   ${gold("7")} ${"whoami"}    ${dim("— account, tokens, key expiry")}`,
  `   ${gold("9")} ${"guide"}     ${dim("— how to use Stinger SSH")}`,
  isAdminKey ? `   ${gold("8")} ${"admin"}      ${dim("— users, bans, tokens, platform stats")}` : "",
  `   ${gold("0")} ${"revoke"}    ${dim("— revoke this key")}`,
  "",
  dim("  Type an activity name (or its number) then your own prompt."),
  "",
].filter(Boolean).join("\n");

const GUIDE = [
  "",
  LOGO,
  "",
  gold("  HOW TO USE STINGER SSH"),
  "",
  neon("  1. Create a key") + dim("  — stinger.co.zw/ssh → Generate key (valid 1440 min)"),
  neon("  2. Load the shim") + dim(" — paste the connect snippet for your terminal, then: stinger menu"),
  neon("  3. Talk to the AI") + dim(" — stinger prompt \"build me a portfolio site\""),
  neon("  4. Open a project") + dim(" — stinger open --project_id <id>   (workspace tools below)"),
  neon("  5. Ship it") + dim("       — stinger deploy --project_id <id> --name my-site → live URL"),
  "",
  gold("  PROJECT WORKSPACE (after `open`)"),
  `   ${neon("ls")}       ${dim("— list the project's files")}`,
  `   ${neon("view")}     ${dim("— view code:  view --project_id <id> --file src/App.tsx")}`,
  `   ${neon("chat")}     ${dim("— ask the AI about this project")}`,
  `   ${neon("code")}     ${dim("— code with the AI, changes are saved to the project")}`,
  `   ${neon("deploy")}   ${dim("— publish and return the live URL")}`,
  `   ${neon("exit")}     ${dim("— leave the workspace")}`,
  "",
  dim("  Every command accepts --model gaga-ai-nexus | hostify-ai"),
  dim("  Tokens: chat 3 · code 12 · deploy 5   ·   admin keys are never charged"),
  "",
].join("\n");

const NUM: Record<string, string> = {
  "1": "prompt", "2": "projects", "3": "open", "4": "deploy",
  "5": "builds", "6": "models", "7": "whoami", "8": "admin", "9": "guide", "0": "revoke",
};


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

    if (!keyRow) return json({ error: bad("Invalid Stinger SSH key") }, 401);
    if (keyRow.revoked) return json({ error: bad("This SSH key has been revoked") }, 403);
    // Admin keys never expire; user keys do.
    if (!keyRow.is_admin_key && keyRow.expires_at && new Date(keyRow.expires_at) < new Date()) {
      return json({ error: bad("SSH key expired — generate a new one at stinger.co.zw/ssh") }, 403);
    }

    const uid = keyRow.user_id;
    const scopes: string[] = keyRow.scopes || [];
    const isAdminKey = !!keyRow.is_admin_key;
    const need = (s: string) => isAdminKey || scopes.includes(s);
    const args = body.args || {};
    let command: string = String(body.command || "menu").trim();
    if (NUM[command]) command = NUM[command];

    const { data: prof } = await admin.from("profiles")
      .select("display_name, email, plan, referral_code").eq("user_id", uid).maybeSingle();
    const username = slugify((prof?.email || "user").split("@")[0]);

    await admin.from("project_ssh_keys").update({
      last_used_at: new Date().toISOString(),
      uses: (keyRow.uses || 0) + 1,
      commands_run: (keyRow.commands_run || 0) + 1,
      last_ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      last_device: (req.headers.get("user-agent") || "").slice(0, 160) || null,
    }).eq("id", keyRow.id);

    const logActivity = (detail: string, tokens = 0) =>
      admin.from("ssh_activity").insert({ user_id: uid, key_id: keyRow.id, command, detail: detail.slice(0, 300), tokens });

    switch (command) {
      case "menu":
      case "help":
        await logActivity("opened menu");
        return json({ ok: true, output: menu(isAdminKey), prompt: `root@${username}.stingerssh:~$ `, admin: isAdminKey });

      case "whoami": {
        const t = await balance(uid);
        await logActivity("whoami");
        return json({
          ok: true,
          output: [
            LOGO, "",
            `  ${dim("user  ")} ${gold(prof?.display_name || prof?.email || uid)}`,
            `  ${dim("plan  ")} ${neon(prof?.plan || "free")}`,
            `  ${dim("tokens")} ${t <= 0 ? bad(String(t)) : ok(String(t))}`,
            `  ${dim("key   ")} ${keyRow.label}${isAdminKey ? gold("  [ADMIN — never expires]") : ""}`,
            `  ${dim("expiry")} ${isAdminKey ? gold("never") : keyRow.expires_at}`,
          ].join("\n"),
          tokens: t, admin: isAdminKey,
        });
      }

      case "models":
        return json({ ok: true, output: MODELS.map(m => `  ${gold("•")} ${m}`).join("\n"), models: MODELS });

      case "model": {
        const model = String(args.model || "");
        if (!MODELS.includes(model)) return json({ error: bad(`Unknown model. Available: ${MODELS.join(", ")}`) }, 400);
        return json({ ok: true, output: ok(`Model switched to ${model}`), model });
      }

      case "projects": {
        const { data } = await admin.from("projects").select("id, name, language, updated_at")
          .eq("user_id", uid).order("updated_at", { ascending: false }).limit(50);
        const out = (data || []).length
          ? (data || []).map((p: any) => `  ${gold(p.id.slice(0, 8))}  ${neon(p.name)}  ${dim(p.language || "")}`).join("\n")
          : dim("  no projects yet — run: prompt \"build me a portfolio site\"");
        return json({ ok: true, output: out, projects: data || [] });
      }

      case "cat": {
        if (!need("files")) return json({ error: bad("Key lacks the 'files' scope") }, 403);
        const { data } = await admin.from("projects").select("name, code_content")
          .eq("id", args.project_id).eq("user_id", uid).maybeSingle();
        if (!data) return json({ error: bad("Project not found") }, 404);
        return json({ ok: true, output: data.code_content || "", name: data.name });
      }

      case "builds": {
        const { data } = await admin.from("apk_builds").select("id, target, status, progress, stage, apk_url, created_at")
          .eq("user_id", uid).order("created_at", { ascending: false }).limit(10);
        return json({
          ok: true,
          output: (data || []).map((b: any) => `  ${gold(b.target)} ${b.status === "done" ? ok(b.status) : neon(b.status)} ${b.progress}% ${dim(b.apk_url || "")}`).join("\n") || dim("  no builds yet"),
          builds: data || [],
        });
      }

      case "prompt":
      case "chat": {
        if (!need("chat")) return json({ error: bad("Key lacks the 'chat' scope") }, 403);
        const prompt = String(args.prompt || body.prompt || "").trim();
        if (!prompt) return json({ error: bad('Usage: prompt "your own instruction"') }, 400);

        const tokens = await balance(uid);
        if (!isAdminKey && tokens <= 0) {
          return json({ error: bad("Out of tokens. Top up at stinger.co.zw/tokens") }, 402);
        }

        const mode = args.mode === "code" || /build|create|app|website|site|api|bot/i.test(prompt) ? "code" : "chat";
        const model = MODELS.includes(String(args.model)) ? String(args.model) : "gaga-ai-nexus";
        const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-router`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({
            provider: model === "hostify-ai" ? "hostify" : "gaga",
            model, mode,
            messages: [
              { role: "system", content: `You are Stinger AI on a remote SSH session for ${username}. Be concise and terminal-friendly.` },
              { role: "user", content: prompt },
            ],
          }),
        });
        const text = await res.text();
        if (!res.ok) return json({ error: bad(`AI request failed [${res.status}]`) }, res.status);
        const answer = parseSSE(text);

        // Name the project from the prompt — max 4 words, AI-derived.
        let projectId: string | null = args.project_id || null;
        let projectName = "";
        if (mode === "code") {
          projectName = await deriveName(prompt);
          const files = extractFiles(answer);
          const { data: created } = await admin.from("projects").insert({
            user_id: uid,
            name: projectName,
            language: "typescript",
            description: prompt.slice(0, 200),
            code_content: files || answer,
          }).select("id").maybeSingle();
          projectId = created?.id ?? projectId;
        }

        // Sync into chat history so SSH work shows up in the web app.
        const { data: thread } = await admin.from("chat_threads").insert({
          user_id: uid, title: (projectName || prompt).slice(0, 60), mode,
        }).select("id").maybeSingle();
        if (thread?.id) {
          await admin.from("chat_messages").insert([
            { thread_id: thread.id, user_id: uid, role: "user", content: prompt },
            { thread_id: thread.id, user_id: uid, role: "assistant", content: answer },
          ]);
        }

        const cost = mode === "code" ? 12 : 3;
        if (!isAdminKey) await spend(uid, cost, "SSH prompt", prompt);
        await admin.from("project_ssh_keys")
          .update({ tokens_spent: (keyRow.tokens_spent || 0) + (isAdminKey ? 0 : cost) }).eq("id", keyRow.id);
        await logActivity(prompt, isAdminKey ? 0 : cost);

        const header = mode === "code"
          ? `${dim(`root@${username}.stingerssh`)}:${neon(`~/projects/${slugify(projectName)}`)}$ ${gold("stinger build")}\n`
          : "";
        return json({
          ok: true, model, project_id: projectId, project_name: projectName,
          tokens_left: isAdminKey ? null : Math.max(0, tokens - cost),
          cwd: projectId ? `~/projects/${slugify(projectName)}` : "~",
          prompt: `root@${username}.stingerssh:${projectId ? `~/projects/${slugify(projectName)}` : "~"}$ `,
          output: `${header}${answer}\n\n${dim(isAdminKey ? "admin session — no tokens charged" : `− ${cost} tokens · ${Math.max(0, tokens - cost)} left`)}`,
        });
      }

      case "deploy": {
        if (!need("deploy")) return json({ error: bad("Key lacks the 'deploy' scope") }, 403);
        const { data: project } = await admin.from("projects").select("*")
          .eq("id", args.project_id).eq("user_id", uid).maybeSingle();
        if (!project) return json({ error: bad("Project not found") }, 404);
        const site = slugify(args.name || project.name);
        const { data: taken } = await admin.from("deployments").select("project_id")
          .eq("username", username).eq("slug", site).maybeSingle();
        if (taken && taken.project_id !== project.id) return json({ error: bad(`"${site}" is already taken`) }, 409);
        const url = `https://stinger.co.zw/${username}/${site}`;
        const logs = [
          `${dim("[1/4]")} ${neon("bundling")} ${project.name}`,
          `${dim("[2/4]")} ${neon("optimising assets")}`,
          `${dim("[3/4]")} ${neon("uploading to Stinger edge")}`,
          `${dim("[4/4]")} ${ok("live")} → ${gold(url)}`,
        ];
        const { error } = await admin.from("deployments").upsert({
          user_id: uid, project_id: project.id, username, slug: site, title: args.name || project.name,
          status: "live", url, logs: [`[${new Date().toISOString()}] Deployed from Stinger SSH`],
        }, { onConflict: "username,slug" });
        if (error) return json({ error: bad(error.message) }, 500);
        if (!isAdminKey) await spend(uid, 5, "SSH deploy", site);
        await logActivity(`deployed ${site}`, isAdminKey ? 0 : 5);
        return json({ ok: true, url, path: `/${username}/${site}`, output: `${logs.join("\n")}\n` });
      }

      case "admin": {
        if (!isAdminKey) return json({ error: bad("Admin SSH key required") }, 403);
        const sub = String(args.action || "stats");
        if (sub === "ban" || sub === "suspend" || sub === "restore") {
          const target = String(args.user || "");
          const patch = sub === "restore"
            ? { is_banned: false, is_suspended: false, ban_reason: null }
            : sub === "ban"
              ? { is_banned: true, ban_reason: args.reason || "Violation of terms" }
              : { is_suspended: true, ban_reason: args.reason || "Temporary suspension" };
          const { error } = await admin.from("profiles").update(patch).eq("email", target);
          if (error) return json({ error: bad(error.message) }, 500);
          await logActivity(`${sub} ${target}`);
          return json({ ok: true, output: ok(`${sub} applied to ${target}`) });
        }
        if (sub === "grant") {
          const target = String(args.user || "");
          const amount = Number(args.amount || 0);
          const { data: p } = await admin.from("profiles").select("user_id").eq("email", target).maybeSingle();
          if (!p) return json({ error: bad("User not found") }, 404);
          const cur = await balance(p.user_id);
          await admin.from("token_balances").upsert({ user_id: p.user_id, balance: Math.max(0, cur + amount) }, { onConflict: "user_id" });
          await logActivity(`granted ${amount} to ${target}`);
          return json({ ok: true, output: ok(`${amount > 0 ? "Granted" : "Deducted"} ${Math.abs(amount)} tokens → ${target}`) });
        }
        const [{ count: users }, { count: keys }, { count: deploys }] = await Promise.all([
          admin.from("profiles").select("*", { count: "exact", head: true }),
          admin.from("project_ssh_keys").select("*", { count: "exact", head: true }),
          admin.from("deployments").select("*", { count: "exact", head: true }),
        ]);
        return json({
          ok: true,
          output: [
            LOGO, "", gold("  ADMIN SSH"), "",
            `  ${dim("users      ")} ${neon(String(users ?? 0))}`,
            `  ${dim("ssh keys   ")} ${neon(String(keys ?? 0))}`,
            `  ${dim("deployments")} ${neon(String(deploys ?? 0))}`,
            "",
            dim("  admin --action ban|suspend|restore --user <email> [--reason x]"),
            dim("  admin --action grant --user <email> --amount 500"),
          ].join("\n"),
        });
      }

      case "revoke":
        await admin.from("project_ssh_keys").update({ revoked: true }).eq("id", keyRow.id);
        return json({ ok: true, output: ok("Key revoked. Generate a new one at stinger.co.zw/ssh") });

      default:
        return json({ error: bad(`Unknown activity "${command}". Run 'menu'.`) }, 400);
    }
  } catch (e: any) {
    console.error("ssh-gateway error", e);
    return json({ error: e?.message || "Server error" }, 500);
  }
});

async function balance(uid: string) {
  const { data } = await admin.from("token_balances").select("balance").eq("user_id", uid).maybeSingle();
  return data?.balance ?? 0;
}

async function spend(uid: string, cost: number, action: string, description: string) {
  const cur = await balance(uid);
  await admin.from("token_balances").upsert({ user_id: uid, balance: Math.max(0, cur - cost) }, { onConflict: "user_id" });
  await admin.from("token_transactions").insert({ user_id: uid, amount: -cost, action, description: description.slice(0, 100) });
}

/** Ask the AI for a project name, hard-capped at 4 words. */
async function deriveName(prompt: string): Promise<string> {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/ai-router`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
      body: JSON.stringify({
        provider: "gaga", model: "nexus", mode: "chat",
        messages: [{ role: "user", content: `Name this project in AT MOST 4 words, title case, no quotes, no punctuation: "${prompt}"` }],
      }),
    });
    const name = parseSSE(await r.text()).replace(/["'`\n]/g, " ").trim();
    const words = name.split(/\s+/).filter(Boolean).slice(0, 4);
    if (words.length) return words.join(" ").slice(0, 48);
  } catch { /* fall through */ }
  return prompt.split(/\s+/).filter(Boolean).slice(0, 4).join(" ") || "Stinger Project";
}

function extractFiles(answer: string): string | null {
  const m = answer.match(/\{[\s\S]*"files"[\s\S]*\}/);
  return m ? m[0] : null;
}

function json(b: any, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function slugify(s: string) { return (s || "app").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "app"; }
async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
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
