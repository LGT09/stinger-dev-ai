import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Pushes a project to CodeVerse Stinger AI Dev via its native repo-api edge function.
 * Endpoint base: https://vaomqjetwvkffkiwqvsc.supabase.co/functions/v1/repo-api
 * Auth: Bearer cv_... personal access token (scopes repo:create + repo:write).
 *
 * Body: { repoName, description?, files: [{path,content}], userToken?, isPrivate? }
 */
const CV_BASE = "https://vaomqjetwvkffkiwqvsc.supabase.co/functions/v1/repo-api";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { repoName, description, files, userToken, isPrivate } = await req.json();
    if (!repoName || !Array.isArray(files)) return json({ error: "repoName and files[] are required" }, 400);
    const token = userToken || Deno.env.get("CODEVERSE_API_TOKEN");
    if (!token) return json({ error: "CodeVerse token not configured. Add it in Integrations → CodeVerse." }, 400);
    if (!token.startsWith("cv_")) return json({ error: "Invalid CodeVerse token (must start with cv_)" }, 400);

    const authHdr = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    // 1. Create the repo (POST /repos). Returns 201 with the created repo, or 400 if it already exists.
    const createRes = await fetch(`${CV_BASE}/repos`, {
      method: "POST",
      headers: authHdr,
      body: JSON.stringify({
        name: repoName,
        description: description || "Pushed from Stinger AI Dev",
        is_private: !!isPrivate,
        language: "TypeScript",
        readme: `# ${repoName}\n\n${description || "Pushed from Stinger AI Dev."}`,
      }),
    });
    const createTxt = await createRes.text();
    let repo: any = {};
    try { repo = JSON.parse(createTxt); } catch {}
    const repoExists = !createRes.ok && /exists|duplicate|unique/i.test(createTxt);
    if (!createRes.ok && !repoExists) {
      console.error("CodeVerse create failed", createRes.status, createTxt);
      return json({ error: `CodeVerse create: ${repo?.error || createTxt.slice(0, 200) || createRes.status}` }, 200);
    }

    // 2. Resolve owner username — needed for file upload path.
    let username: string | undefined =
      repo?.repo?.owner_username || repo?.repo?.username || repo?.owner?.username;
    if (!username) {
      // Try the /user whoami endpoint exposed by repo-api.
      const whoRes = await fetch(`${CV_BASE}/user`, { headers: authHdr });
      if (whoRes.ok) {
        const wj = await whoRes.json().catch(() => ({}));
        username = wj?.username || wj?.user?.username || wj?.profile?.username;
      }
    }
    if (!username) {
      const reposRes = await fetch(`${CV_BASE}/repos`, { headers: authHdr });
      if (reposRes.ok) {
        const rj = await reposRes.json().catch(() => ({}));
        username = rj?.repos?.[0]?.owner_username || rj?.repos?.[0]?.username;
      }
    }
    if (!username) {
      return json({ error: "CodeVerse cannot find your username. Open Integrations → CodeVerse and set your CodeVerse username before pushing." }, 200);
    }

    // 3. Bulk upload files: POST /repos/{username}/{repo}/files  body: { files: [{path,content}], commit_message }
    const uploadRes = await fetch(`${CV_BASE}/repos/${encodeURIComponent(username)}/${encodeURIComponent(repoName)}/files`, {
      method: "POST",
      headers: authHdr,
      body: JSON.stringify({
        files: files.map((f: any) => ({ path: f.path, content: f.content || "" })),
        commit_message: `Initial push from Stinger AI Dev — ${files.length} file(s)`,
      }),
    });
    const uploadTxt = await uploadRes.text();
    let uploadJson: any = {};
    try { uploadJson = JSON.parse(uploadTxt); } catch {}
    if (!uploadRes.ok) {
      console.error("CodeVerse files upload failed", uploadRes.status, uploadTxt);
      return json({ error: `CodeVerse upload: ${uploadJson?.error || uploadTxt.slice(0, 200) || uploadRes.status}` }, 200);
    }

    const successCount = (uploadJson?.results || []).filter((r: any) => r.created || r.updated).length;
    return json({
      success: true,
      url: `https://codeverse.stinger.co.zw/${username}/${repoName}`,
      repo: repo?.repo || null,
      filesPushed: successCount,
      total: files.length,
      results: uploadJson?.results || [],
    });
  } catch (e: any) {
    console.error("codeverse-push error", e);
    return json({ error: e?.message || "Unknown error" }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}