import { supabase } from "@/integrations/supabase/client";
import { parseProjectFiles, buildPreviewHTML, isWebProject, type ParsedFile } from "@/lib/projectFiles";

export const slugify = (s: string) =>
  (s || "project").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "project";

/**
 * The floating "Built in Stinger" badge injected into every deployed site.
 */
export const STINGER_BADGE = `
<div id="stinger-badge" style="position:fixed;right:18px;bottom:18px;z-index:2147483000;font-family:system-ui,sans-serif">
  <div id="stinger-badge-card" style="display:none;margin-bottom:10px;max-width:250px;background:rgba(15,18,22,.94);color:#e7eaf0;border:1px solid rgba(255,212,0,.35);border-radius:14px;padding:12px 14px;font-size:12px;line-height:1.5;box-shadow:0 12px 40px rgba(0,0,0,.45);backdrop-filter:blur(12px)">
    This software was created in <strong style="color:#ffd400">stinger.co.zw</strong>, Created your own software and apps in stinger.co.zw.
    <a href="https://stinger.co.zw" target="_blank" rel="noopener" style="display:block;margin-top:8px;text-align:center;background:#ffd400;color:#0f1216;font-weight:700;border-radius:8px;padding:6px 10px;text-decoration:none">Start building free</a>
  </div>
  <button id="stinger-badge-btn" aria-label="Built in Stinger AI Dev"
    style="width:52px;height:52px;border:none;border-radius:50%;cursor:pointer;background:linear-gradient(135deg,#ffd400,#ffb400);box-shadow:0 8px 28px rgba(255,212,0,.45);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:20px;color:#0f1216;animation:stinger-hover 3s ease-in-out infinite">S</button>
</div>
<style>@keyframes stinger-hover{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}</style>
<script>(function(){var b=document.getElementById('stinger-badge-btn'),c=document.getElementById('stinger-badge-card');
b.addEventListener('click',function(){c.style.display=c.style.display==='block'?'none':'block';});})();</script>`;

/** Build the final deployable HTML document (site + Stinger hover badge). */
export const buildDeployHTML = (files: ParsedFile[], title: string): string => {
  let html = buildPreviewHTML(files, title);
  if (html.includes("</body>")) html = html.replace("</body>", `${STINGER_BADGE}</body>`);
  else html += STINGER_BADGE;
  return html;
};

export interface DeployResult { url: string; path: string; slug: string }

/** True when the given username/slug pair is free (or already owned by `projectId`). */
export const isSlugAvailable = async (username: string, slug: string, projectId?: string) => {
  const { data } = await supabase
    .from("deployments")
    .select("id, project_id")
    .eq("username", username)
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return true;
  return !!projectId && data.project_id === projectId;
};

/**
 * Deploy a project as a live website at /{username}/{project-slug}.
 * `siteName` lets the user rename the site at deploy time; the slug is derived
 * from it and must not collide with an existing deployment.
 */
export const deployProject = async (
  project: { id: string; name: string; code_content?: string | null },
  username: string,
  userId: string,
  siteName?: string,
): Promise<DeployResult> => {
  const files = parseProjectFiles(project.code_content, `${project.name}.txt`);
  if (files.length === 0) throw new Error("This project has no files to deploy yet.");
  if (!isWebProject(files)) throw new Error("Only web projects (HTML/JSX/TSX) can be deployed as a live site.");

  const title = (siteName || project.name).trim();
  const slug = slugify(title);
  if (!(await isSlugAvailable(username, slug, project.id))) {
    throw new Error(`"${slug}" is already taken — pick another site name.`);
  }

  const html = buildDeployHTML(files, title);
  const path = `/${username}/${slug}`;
  const url = `${window.location.origin}${path}`;
  const logs = [
    `[${new Date().toISOString()}] Collected ${files.length} file(s)`,
    `[${new Date().toISOString()}] Compiled site bundle (${(html.length / 1024).toFixed(1)} KB)`,
    `[${new Date().toISOString()}] Injected Stinger badge`,
    `[${new Date().toISOString()}] Published at ${path}`,
  ];

  // Free the project's previous slug so the old name is no longer served.
  await supabase.from("deployments").delete().eq("project_id", project.id).eq("user_id", userId).neq("slug", slug);

  const { error } = await supabase
    .from("deployments")
    .upsert(
      { user_id: userId, project_id: project.id, username, slug, title, html, url, status: "live", logs },
      { onConflict: "username,slug" },
    );
  if (error) throw new Error(error.message);

  return { url, path, slug };
};

/** Take a site offline but keep its record (can be re-deployed later). */
export const undeployProject = async (deploymentId: string) => {
  const { error } = await supabase.from("deployments").update({ status: "offline" }).eq("id", deploymentId);
  if (error) throw new Error(error.message);
};

/** Bring an offline site back online. */
export const redeployProject = async (deploymentId: string) => {
  const { error } = await supabase.from("deployments").update({ status: "live" }).eq("id", deploymentId);
  if (error) throw new Error(error.message);
};

/** Permanently remove a deployment and free its URL. */
export const deleteDeployment = async (deploymentId: string) => {
  const { error } = await supabase.from("deployments").delete().eq("id", deploymentId);
  if (error) throw new Error(error.message);
};