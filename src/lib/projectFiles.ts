import JSZip from "jszip";

export interface ParsedFile {
  path: string;
  content: string;
}

/**
 * Parse a project's `code_content` (string with `// === path ===` separators)
 * back into individual files. Falls back to a single file if no markers found.
 */
export const parseProjectFiles = (codeContent: string | null | undefined, fallbackName = "project.txt"): ParsedFile[] => {
  if (!codeContent) return [];
  const marker = /\/\/\s*===\s*(.+?)\s*===\s*\n/g;
  const matches = [...codeContent.matchAll(marker)];
  if (matches.length === 0) {
    return [{ path: fallbackName, content: codeContent }];
  }
  const files: ParsedFile[] = [];
  for (let i = 0; i < matches.length; i++) {
    const path = matches[i][1].trim();
    const startIdx = matches[i].index! + matches[i][0].length;
    const endIdx = i + 1 < matches.length ? matches[i + 1].index! : codeContent.length;
    files.push({ path, content: codeContent.slice(startIdx, endIdx).trim() });
  }
  return files;
};

/**
 * Re-serialize edited files back into the same `// === path ===` format.
 */
export const serializeProjectFiles = (files: ParsedFile[]): string =>
  files.map(f => `// === ${f.path} ===\n${f.content}`).join("\n\n");

/**
 * Build a tree structure for file-explorer rendering.
 */
export interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
  file?: ParsedFile;
}

export const buildTree = (files: ParsedFile[]): TreeNode => {
  const root: TreeNode = { name: "/", path: "", isDir: true, children: [] };
  for (const f of files) {
    const parts = f.path.split("/").filter(Boolean);
    let node = root;
    for (let i = 0; i < parts.length; i++) {
      const isLast = i === parts.length - 1;
      const path = parts.slice(0, i + 1).join("/");
      let child = node.children.find(c => c.name === parts[i]);
      if (!child) {
        child = { name: parts[i], path, isDir: !isLast, children: [], file: isLast ? f : undefined };
        node.children.push(child);
      }
      node = child;
    }
  }
  // sort: folders first, then files
  const sortRec = (n: TreeNode) => {
    n.children.sort((a, b) => (a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1));
    n.children.forEach(sortRec);
  };
  sortRec(root);
  return root;
};

/**
 * Download all project files as a ZIP, named after the project.
 */
export const downloadProjectAsZip = async (projectName: string, files: ParsedFile[]) => {
  const zip = new JSZip();
  if (files.length === 0) {
    zip.file("README.md", `# ${projectName}\n\nThis project has no generated files yet.`);
  } else {
    files.forEach(f => zip.file(f.path, f.content));
    zip.file("README.md", `# ${projectName}\n\nExported from Stinger AI Dev — by Vincent Ganiza (Traxxion Tech).\n\n## Files\n\n${files.map(f => `- ${f.path}`).join("\n")}`);
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${projectName.replace(/[^a-zA-Z0-9-_]+/g, "-").toLowerCase()}.zip`;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Detect if a project is a renderable web/HTML project (has html/jsx files).
 */
export const isWebProject = (files: ParsedFile[]): boolean =>
  files.some(f => /\.(html|tsx|jsx|vue|svelte)$/i.test(f.path)) ||
  files.some(f => f.content.includes("<!DOCTYPE html") || f.content.includes("<html"));

/**
 * Build an HTML preview document for the project. Combines all CSS, JS, and HTML files
 * into a single <iframe srcdoc> document. Best-effort.
 */
export const buildPreviewHTML = (files: ParsedFile[], title = "Preview"): string => {
  const htmlFile = files.find(f => /index\.html$/i.test(f.path)) || files.find(f => f.content.includes("<html"));
  if (htmlFile) {
    // Inline matching CSS/JS by relative path if possible
    let html = htmlFile.content;
    const cssFiles = files.filter(f => /\.css$/i.test(f.path));
    const jsFiles = files.filter(f => /\.(js|mjs)$/i.test(f.path));
    const styleTag = cssFiles.map(f => `<style>${f.content}</style>`).join("\n");
    const scriptTag = jsFiles.map(f => `<script>${f.content}</script>`).join("\n");
    if (html.includes("</head>")) html = html.replace("</head>", `${styleTag}</head>`);
    else html = `${styleTag}\n${html}`;
    if (html.includes("</body>")) html = html.replace("</body>", `${scriptTag}</body>`);
    else html = `${html}\n${scriptTag}`;
    return html;
  }

  // Fallback: render a "this is a code project, here's a summary" page
  const fileList = files.slice(0, 20).map(f => `<li><code>${f.path}</code></li>`).join("");
  return `<!DOCTYPE html>
<html><head><title>${title}</title>
<style>
  body { font-family: 'Inter', system-ui, sans-serif; background: #0f1216; color: #e7eaf0; padding: 32px; line-height: 1.6; }
  h1 { color: #ffd400; margin-bottom: 4px; }
  p { color: #8a929e; }
  code { background: #1a1f26; padding: 2px 6px; border-radius: 4px; color: #00e5ff; font-size: 12px; }
  ul { list-style: none; padding: 0; }
  li { padding: 6px 0; border-bottom: 1px solid #1a1f26; }
  .badge { display: inline-block; background: #ffd400; color: #0f1216; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; }
</style></head>
<body>
  <span class="badge">Stinger AI Dev</span>
  <h1>${title}</h1>
  <p>This project's source isn't a renderable website. Here's a file overview:</p>
  <ul>${fileList}</ul>
</body></html>`;
};
