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
  const cssAll = files.filter(f => /\.css$/i.test(f.path)).map(f => f.content).join("\n");
  const reactFiles = files.filter(f => /\.(jsx|tsx)$/i.test(f.path));

  if (htmlFile && reactFiles.length === 0) {
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

  // React / JSX / TSX project → compile in the browser with Babel standalone.
  if (reactFiles.length > 0) return buildReactPreviewHTML(reactFiles, cssAll, title);

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

/** Normalise a module path so the in-browser loader can resolve it. */
const normalizeKey = (p: string) => p.replace(/^\.\//, "").replace(/^\//, "").replace(/\.(jsx|tsx|js|ts)$/i, "");

/**
 * Compile a React/JSX project into a self-contained HTML document using
 * Babel standalone plus a tiny CommonJS-style module registry. This is what
 * makes deployed React projects actually render instead of showing a blank page.
 */
export const buildReactPreviewHTML = (reactFiles: ParsedFile[], css: string, title: string): string => {
  const entry =
    reactFiles.find(f => /(^|\/)(main|index)\.(jsx|tsx)$/i.test(f.path)) ||
    reactFiles.find(f => /(^|\/)App\.(jsx|tsx)$/i.test(f.path)) ||
    reactFiles[0];

  const modules = reactFiles
    .map(f => `  ${JSON.stringify(normalizeKey(f.path))}: function(exports, require, module){\n${f.content}\n},`)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title}</title>
<script src="https://cdn.tailwindcss.com"></script>
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/@babel/standalone@7/babel.min.js"></script>
<style>html,body,#root{min-height:100%}${css}</style>
</head>
<body><div id="root"></div>
<script>
window.__STINGER_SOURCES__ = ${JSON.stringify(
    Object.fromEntries(reactFiles.map(f => [normalizeKey(f.path), f.content])),
  )};
window.__STINGER_ENTRY__ = ${JSON.stringify(normalizeKey(entry.path))};
(function(){
  var sources = window.__STINGER_SOURCES__, cache = {};
  function resolve(from, spec){
    if (!spec.startsWith('.')) return null;
    var base = from.split('/').slice(0, -1);
    spec.replace(/^\\.\\//,'').split('/').forEach(function(part){
      if (part === '..') base.pop(); else if (part !== '.') base.push(part);
    });
    var key = base.join('/').replace(/\\.(jsx|tsx|js|ts)$/i,'');
    if (sources[key]) return key;
    if (sources[key + '/index']) return key + '/index';
    return null;
  }
  function req(from, spec){
    if (spec === 'react') return window.React;
    if (spec === 'react-dom' || spec === 'react-dom/client') {
      return { ...window.ReactDOM, createRoot: window.ReactDOM.createRoot, default: window.ReactDOM };
    }
    if (/\\.css$/i.test(spec)) return {};
    var key = resolve(from, spec);
    if (!key) return {};
    return load(key);
  }
  function load(key){
    if (cache[key]) return cache[key].exports;
    var module = { exports: {} };
    cache[key] = module;
    var code = window.Babel.transform(sources[key], {
      presets: [['react', { runtime: 'classic' }], ['typescript', { allExtensions: true, isTSX: true }]],
      plugins: [['transform-modules-commonjs', { strictNamespace: false }]],
      filename: key + '.tsx',
    }).code;
    new Function('exports','require','module','React', code)(
      module.exports, function(s){ return req(key, s); }, module, window.React
    );
    return module.exports;
  }
  try {
    var mod = load(window.__STINGER_ENTRY__);
    var Root = mod && (mod.default || mod.App);
    if (typeof Root === 'function') {
      window.ReactDOM.createRoot(document.getElementById('root')).render(window.React.createElement(Root));
    }
  } catch (e) {
    document.getElementById('root').innerHTML =
      '<pre style="padding:24px;font:13px/1.6 ui-monospace,monospace;color:#ff6b6b;white-space:pre-wrap">'
      + String(e && e.message || e) + '</pre>';
    console.error(e);
  }
})();
</script>
</body></html>`;
};
