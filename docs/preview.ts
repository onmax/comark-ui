// The playground's preview is a document of its own, so the plugins' inlined scripts run as they do on a real page.
// The build writes the first preset with it and the playground every edit after, with the Theme pane's scheme as a
// class on the root and its CSS in #play-theme, so a render doesn't flash the default theme.
export const previewDocument = (html: string, theme?: { scheme: string; css: string }) =>
  `<!doctype html><html lang="en"${theme ? ` class="${theme.scheme}" style="color-scheme:${theme.scheme}"` : ' style="color-scheme:light dark"'}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
  `<link rel="stylesheet" href="/style.css"><style>body{padding:2rem;background:var(--comark-background,var(--bg))}body>main{margin:0}</style>` +
  `<style id="play-theme">${theme ? theme.css.replaceAll("</", "<\\/") : ""}</style></head>` +
  `<body><main class="play-preview-content">${html}</main></body></html>`;

// A gallery cell: one example, padded as on its page, and as tall as its content, which the gallery's
// script reads to size the frame. The editor passes the frame's scheme, so a render starts in it.
export const cellDocument = (html: string, scheme?: string) =>
  previewDocument(
    `<style>body{padding:0}html{overflow-y:hidden}.example-preview{padding:1.25rem 1.5rem}</style><div class="example-preview">${html}</div>`,
    scheme ? { scheme, css: "" } : undefined,
  );
