import type { PlaygroundFiles } from "@vite-hub/ui-playground/playground-render";
import { themeFile } from "./play-link.ts";
import { readTheme, schemeCss, schemeOf, themeCss } from "./play-theme.ts";

// The playground's preview is a document of its own, so the plugins' inlined scripts run as they do on a real page.
// The build writes the first preset with it and the playground every edit after, with the Theme pane's scheme as a
// class on the root and its CSS in #play-theme, so a render doesn't flash the default theme.
export const previewDocument = (html: string, theme?: { scheme: string; css: string }) =>
  `<!doctype html><html lang="en"${theme ? ` class="${theme.scheme}" style="color-scheme:${theme.scheme}"` : ' style="color-scheme:light dark"'}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
  `<link rel="stylesheet" href="/play/preview.css"><style>body{padding:2rem;background:var(--comark-background,var(--bg))}body>main{margin:0}</style>` +
  `<style id="play-theme">${theme ? theme.css.replaceAll("</", "<\\/") : ""}</style></head>` +
  `<body><main class="play-preview-content">${html}</main></body></html>`;

/** The preview's page: comark-ui's styles, then the shadcn tokens of its scheme and the Theme pane's CSS. */
export function playDocument(html: string, files: PlaygroundFiles) {
  const { theme } = readTheme(files[themeFile]);
  const scheme = schemeOf(theme);
  // The frame owns system changes even while the Theme pane is closed, without writing a scheme into the files.
  const followSystem = theme.scheme
    ? ""
    : '<script>(()=>{const system=matchMedia("(prefers-color-scheme: dark)");const follow=()=>{const scheme=system.matches?"dark":"light";document.documentElement.className=scheme;document.documentElement.style.colorScheme=scheme};system.addEventListener("change",follow);follow()})()</script>';
  const colors = theme.scheme
    ? schemeCss(scheme)
    : `${schemeCss("light")}\n@media (prefers-color-scheme: dark) {\n${schemeCss("dark")}\n}`;
  return previewDocument(followSystem + html, {
    scheme,
    css: [colors, themeCss(theme)].filter(Boolean).join("\n\n"),
  });
}

// A gallery cell: one example, padded as on its page, and as tall as its content, which the gallery's
// script reads to size the frame. The editor passes the frame's scheme, so a render starts in it.
export const cellDocument = (html: string, scheme?: string) =>
  previewDocument(
    `<style>body{padding:0}html{overflow-y:hidden}.example-preview{padding:1.25rem 1.5rem}</style><div class="example-preview">${html}</div>`,
    scheme ? { scheme, css: "" } : undefined,
  );
