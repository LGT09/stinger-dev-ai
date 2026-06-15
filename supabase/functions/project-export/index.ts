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
      const { data: build, error: bErr } = await admin.from("apk_builds").insert({
        project_id: projectId, user_id: userId, status: "pending",
      }).select("id").single();
      if (bErr) return json({ error: bErr.message }, 500);
      return json({ success: true, build_id: build.id, status: "pending", message: "APK build queued — you’ll see a download link as soon as the build is ready." });
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