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

/**
 * Deploy a project as a live website at /{username}/{project-slug}.
 */
export const deployProject = async (
  project: { id: string; name: string; code_content?: string | null },
  username: string,
  userId: string,
): Promise<DeployResult> => {
  const files = parseProjectFiles(project.code_content, `${project.name}.txt`);
  if (files.length === 0) throw new Error("This project has no files to deploy yet.");
  if (!isWebProject(files)) throw new Error("Only web projects (HTML/JSX/TSX) can be deployed as a live site.");

  const slug = slugify(project.name);
  const html = buildDeployHTML(files, project.name);
  const path = `/${username}/${slug}`;
  const url = `${window.location.origin}${path}`;

  const { error } = await supabase
    .from("deployments")
    .upsert(
      { user_id: userId, project_id: project.id, username, slug, title: project.name, html, url, status: "live" },
      { onConflict: "username,slug" },
    );
  if (error) throw new Error(error.message);

  return { url, path, slug };
};