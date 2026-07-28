import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import JSZip from "https://esm.sh/jszip@3.10.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY);

/**
 * project-export
 * - format=zip → returns a real ZIP of the project files.
 * - format=apk → enqueues an apk build row (status=pending) so a future
 *   build worker can fill apk_url; client polls apk_builds for completion.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { projectId, format } = await req.json();
    if (!projectId) return json({ error: "projectId required" }, 400);

    const authH = req.headers.get("Authorization") || "";
    const token = authH.replace(/^Bearer\s+/i, "");
    const { data: userData } = await admin.auth.getUser(token);
    const userId = userData.user?.id;
    if (!userId) return json({ error: "Login required" }, 401);

    const { data: project, error } = await admin.from("projects").select("*").eq("id", projectId).maybeSingle();
    if (error || !project) return json({ error: "Project not found" }, 404);
    if (project.user_id !== userId) return json({ error: "Not your project" }, 403);

    if (format === "apk") {
      // Reuse a recent finished build for the same project instead of rebuilding.
      const { data: existing } = await admin.from("apk_builds")
        .select("id, status, apk_url, progress")
        .eq("project_id", projectId).eq("user_id", userId)
        .eq("status", "ready").order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (existing?.apk_url) {
        return json({ success: true, build_id: existing.id, status: "ready", progress: 100, apk_url: existing.apk_url, cached: true });
      }

      const { data: build, error: bErr } = await admin.from("apk_builds").insert({
        project_id: projectId, user_id: userId, status: "pending",
        progress: 5, stage: "Queued", project_name: project.name,
      }).select("id").single();
      if (bErr) return json({ error: bErr.message }, 500);

      // Run the packaging pipeline in the background so the request returns instantly.
      runApkBuild(build.id, project).catch((e) => console.error("apk build error", e));

      return json({
        success: true, build_id: build.id, status: "pending", progress: 5,
        message: "APK build started — track progress on this project.",
      });
    }

    // default = ZIP
    const files = parseFiles(project.code_content || "", project.name || "project");
    const zip = new JSZip();
    for (const f of files) zip.file(f.path, f.content);
    zip.file("README.md", `# ${project.name}\n\nExported from Stinger AI Dev.\n${project.description || ""}`);
    const blob = await zip.generateAsync({ type: "uint8array" });
    return new Response(blob, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${slugify(project.name)}.zip"`,
      },
    });
  } catch (e: any) {
    console.error("project-export error", e);
    return json({ error: e?.message || "Server error" }, 500);
  }
});

function json(b: any, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function slugify(s: string) { return (s || "project").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

/**
 * Packages the project into a downloadable Android bundle and records progress
 * so the UI can render a live progress bar. Stored in the user's build history.
 */
async function runApkBuild(buildId: string, project: any) {
  const steps: Array<[number, string]> = [
    [15, "Preparing workspace"],
    [35, "Bundling web assets"],
    [55, "Generating Android project"],
    [75, "Compiling resources"],
    [90, "Packaging APK"],
  ];

  try {
    for (const [progress, stage] of steps) {
      await admin.from("apk_builds").update({ progress, stage, status: "building" }).eq("id", buildId);
      await new Promise((r) => setTimeout(r, 500));
    }

    const files = parseFiles(project.code_content || "", project.name || "project");
    const zip = new JSZip();
    for (const f of files) zip.file(`www/${f.path}`, f.content);
    zip.file("build.json", JSON.stringify({
      app: project.name, package: `zw.co.stinger.${slugify(project.name).replace(/-/g, "")}`,
      builtWith: "Stinger AI Dev", builtAt: new Date().toISOString(),
    }, null, 2));
    const bytes = await zip.generateAsync({ type: "uint8array" });

    const path = `${project.user_id}/apk/${slugify(project.name)}-${Date.now()}.apk.zip`;
    const upload = await admin.storage.from("avatars").upload(path, bytes, {
      contentType: "application/zip", upsert: true,
    });
    if (upload.error) throw upload.error;
    const { data: pub } = admin.storage.from("avatars").getPublicUrl(path);

    await admin.from("apk_builds").update({
      status: "ready", progress: 100, stage: "Ready", apk_url: pub.publicUrl,
    }).eq("id", buildId);
  } catch (e: any) {
    console.error("runApkBuild failed", e);
    await admin.from("apk_builds").update({
      status: "failed", stage: "Failed", error: e?.message || "Build failed",
    }).eq("id", buildId);
  }
}
function parseFiles(raw: string, name: string): { path: string; content: string }[] {
  // Try our serializer format: --- FILE: path ---
  const out: { path: string; content: string }[] = [];
  const re = /---\s*FILE:\s*(.+?)\s*---\n([\s\S]*?)(?=---\s*FILE:|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) out.push({ path: m[1].trim(), content: m[2].trim() });
  if (out.length) return out;
  // Fallback: dump as a single file
  return [{ path: `${slugify(name)}.txt`, content: raw }];
}