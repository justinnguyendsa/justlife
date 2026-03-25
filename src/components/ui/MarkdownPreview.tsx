import { useEffect, useRef, useMemo } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';

// ── Configure marked with syntax highlighting via highlight.js ──────────────
const renderer = new marked.Renderer();

renderer.code = function ({ text, lang }) {
  const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
  const highlighted = hljs.highlight(text, { language }).value;
  return `<pre class="hljs-pre"><code class="hljs language-${language}">${highlighted}</code></pre>`;
};

marked.use({
  renderer,
  gfm: true,
  breaks: true,
});

// ── VSCode Dark+ inspired CSS injected once ─────────────────────────────────
const VSCODE_CSS = `
/* ---- Markdown body ---- */
.md-body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 14px;
  line-height: 1.7;
  color: #d4d4d4;
  max-width: 900px;
  padding: 4px 0;
}
.md-body h1,.md-body h2,.md-body h3,.md-body h4,.md-body h5,.md-body h6 {
  font-weight: 700;
  margin: 1.2em 0 0.5em;
  line-height: 1.3;
  color: #e2e8f0;
  border-bottom: 1px solid #2a2d38;
  padding-bottom: 0.25em;
}
.md-body h1 { font-size: 2em; }
.md-body h2 { font-size: 1.5em; }
.md-body h3 { font-size: 1.2em; border-bottom: none; }
.md-body h4,.md-body h5,.md-body h6 { font-size: 1em; border-bottom: none; color: #94a3b8; }
.md-body p { margin: 0.6em 0; }
.md-body a { color: #4fc3f7; text-decoration: none; }
.md-body a:hover { text-decoration: underline; }
.md-body strong { color: #f8fafc; font-weight: 700; }
.md-body em { color: #c3b8f5; font-style: italic; }
.md-body ul,.md-body ol { padding-left: 1.8em; margin: 0.5em 0; }
.md-body li { margin: 0.25em 0; }
.md-body blockquote {
  border-left: 4px solid #4a5568;
  padding: 0.4em 1em;
  margin: 0.8em 0;
  background: #1e2233;
  border-radius: 0 6px 6px 0;
  color: #94a3b8;
}
.md-body code {
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  background: #1e2233;
  border: 1px solid #2a2d38;
  border-radius: 4px;
  padding: 0.15em 0.4em;
  font-size: 0.9em;
  color: #ce9178;
}
.md-body .hljs-pre {
  background: #1e1e1e;
  border: 1px solid #2a2d38;
  border-radius: 8px;
  padding: 1em 1.2em;
  overflow-x: auto;
  margin: 1em 0;
}
.md-body .hljs-pre code {
  background: none;
  border: none;
  padding: 0;
  color: inherit;
  font-size: 13px;
}
.md-body table {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
  font-size: 0.9em;
}
.md-body th { background: #1e2233; color: #94a3b8; font-weight: 700; text-align: left; padding: 8px 12px; border: 1px solid #2a2d38; }
.md-body td { padding: 6px 12px; border: 1px solid #2a2d38; color: #cbd5e1; }
.md-body tr:nth-child(even) td { background: #161b2e; }
.md-body hr { border: none; border-top: 1px solid #2a2d38; margin: 1.5em 0; }
.md-body img { max-width: 100%; border-radius: 6px; border: 1px solid #2a2d38; }

/* ---- highlight.js tokens (VSCode Dark+) ---- */
.hljs { color: #d4d4d4; }
.hljs-keyword,.hljs-selector-tag,.hljs-literal { color: #569cd6; }
.hljs-built_in,.hljs-class .hljs-title { color: #4ec9b0; }
.hljs-string,.hljs-template-literal { color: #ce9178; }
.hljs-number,.hljs-regexp { color: #b5cea8; }
.hljs-comment,.hljs-block-comment { color: #6a9955; font-style: italic; }
.hljs-function,.hljs-title { color: #dcdcaa; }
.hljs-type { color: #4ec9b0; }
.hljs-attr,.hljs-attribute { color: #9cdcfe; }
.hljs-variable { color: #9cdcfe; }
.hljs-symbol,.hljs-bullet { color: #f8c555; }
.hljs-tag { color: #569cd6; }
.hljs-name { color: #4ec9b0; }
.hljs-meta { color: #c586c0; }
`;

let styleInjected = false;
function injectStyle() {
  if (styleInjected) return;
  const el = document.createElement('style');
  el.id = 'vscode-md-style';
  el.textContent = VSCODE_CSS;
  document.head.appendChild(el);
  styleInjected = true;
}

// ── Component ────────────────────────────────────────────────────────────────
interface Props {
  content: string;
}

export default function MarkdownPreview({ content }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    injectStyle();
  }, []);

  const html = useMemo(() => {
    return marked.parse(content) as string;
  }, [content]);

  return (
    <div
      ref={containerRef}
      className="md-body"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
