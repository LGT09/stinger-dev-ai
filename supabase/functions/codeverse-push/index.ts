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

    // CodeVerse mirrors the GitHub REST API shape.
    const base = "https://codeverse.stinger.co.zw/api/v1";
    const authHdr = { Authorization: `token ${token}`, "Content-Type": "application/json", Accept: "application/json" };

    // 1. Look up the authenticated user (GitHub: GET /user)
    let owner = "user";
    try {
      const meRes = await fetch(`${base}/user`, { headers: authHdr });
      if (meRes.ok) {
        const me = await meRes.json();
        owner = me?.login || me?.username || me?.name || owner;
      } else { await meRes.text(); }
    } catch { /* fall back */ }

    // 2. Create the repo (GitHub: POST /user/repos)
    const createRes = await fetch(`${base}/user/repos`, {
      method: "POST",
      headers: authHdr,
      body: JSON.stringify({ name: repoName, description: description || `Pushed from Stinger AI Dev`, private: !!isPrivate, auto_init: true }),
    });
    const createTxt = await createRes.text();
    let repo: any = {};
    try { repo = JSON.parse(createTxt); } catch {}
    // 422 = already exists (GitHub semantics) — that's fine, keep going.
    if (!createRes.ok && createRes.status !== 422 && createRes.status !== 409) {
      console.error("CodeVerse create repo failed", createRes.status, createTxt);
      return json({ error: `CodeVerse: ${repo?.message || createTxt || createRes.status}` }, 200);
    }

    // 3. Upload files (GitHub: PUT /repos/{owner}/{repo}/contents/{path})
    const results: any[] = [];
    for (const f of files) {
      const path = encodeURIComponent(f.path).replace(/%2F/g, "/");
      const url = `${base}/repos/${owner}/${repoName}/contents/${path}`;
      // Try to fetch existing sha (for updates)
      let sha: string | undefined;
      try {
        const g = await fetch(url, { headers: authHdr });
        if (g.ok) { const j = await g.json(); sha = j?.sha; } else { await g.text(); }
      } catch {}
      const b64 = btoa(unescape(encodeURIComponent(f.content || "")));
      const fres = await fetch(url, {
        method: "PUT",
        headers: authHdr,
        body: JSON.stringify({ message: `Add ${f.path} via Stinger AI Dev`, content: b64, ...(sha ? { sha } : {}) }),
      });
      const ftxt = await fres.text();
      results.push({ path: f.path, ok: fres.ok, status: fres.status, error: fres.ok ? undefined : ftxt.slice(0, 200) });
    }

    return json({
      success: true,
      repo: repo?.html_url || repo?.url || `https://codeverse.stinger.co.zw/${owner}/${repoName}`,
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