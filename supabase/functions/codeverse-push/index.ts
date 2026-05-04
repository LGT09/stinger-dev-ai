import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Pushes a project to CodeVerse via either the user-supplied API token (preferred)
 * or the workspace-level CODEVERSE_API_TOKEN secret.
 *
 * Body: { repoName: string, description?: string, files: {path,content}[], userToken?: string, isPrivate?: boolean }
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { repoName, description, files, userToken, isPrivate } = await req.json();
    if (!repoName || !Array.isArray(files)) {
      return json({ error: "repoName and files[] are required" }, 400);
    }
    const token = userToken || Deno.env.get("CODEVERSE_API_TOKEN");
    if (!token) return json({ error: "CodeVerse token not configured. Add it in CodeVerse Integration." }, 400);

    const base = "https://codeverse.stinger.co.zw/api";

    // 1. Create the repo
    const createRes = await fetch(`${base}/repos`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: repoName, description: description || `Pushed from Stinger AI Dev`, private: !!isPrivate }),
    });
    let repo: any = {};
    const createTxt = await createRes.text();
    try { repo = JSON.parse(createTxt); } catch {}
    if (!createRes.ok && createRes.status !== 409) {
      console.error("CodeVerse create repo failed", createRes.status, createTxt);
      return json({ error: `CodeVerse: ${repo?.message || createTxt || createRes.status}` }, createRes.status);
    }

    // 2. Upload files
    const results: any[] = [];
    for (const f of files) {
      const fres = await fetch(`${base}/repos/${encodeURIComponent(repoName)}/files`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ path: f.path, content: f.content, message: `Add ${f.path} via Stinger AI Dev` }),
      });
      results.push({ path: f.path, ok: fres.ok, status: fres.status });
    }

    return json({
      success: true,
      repo: repo?.url || `https://codeverse.stinger.co.zw/${repoName}`,
      filesPushed: results.filter(r => r.ok).length,
      total: files.length,
      results,
    }, 200);
  } catch (e: any) {
    console.error("codeverse-push error", e);
    return json({ error: e?.message || "Unknown error" }, 500);
  }
});

function json(body: any, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}