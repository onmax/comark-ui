import { theme } from "comark-zoom/theme";

/**
 * Players in a bordered frame the page's width, with the link under them, and link cards in the style of shadcn/ui's
 * Item, on the shared `--comark-*` tokens. Override `--ce-app-height` for CodePen, StackBlitz, and Figma,
 * `--ce-short-width` for a YouTube Short, and `--ce-post-width` and `--ce-post-height` for an X post. The rules sit in the `comark` layer, so any unlayered rule of the host's wins.
 */
export const css = `@layer comark{${[
  theme(".ce,.ce-card"),
  ":where(.ce){--ce-app-height:30rem;--ce-short-width:20rem;--ce-post-width:550px;--ce-post-height:30rem}",
  ".ce{margin:1.5rem 0;font-family:var(--_comark-font)}",
  ".ce-frame{overflow:hidden;border:1px solid var(--_comark-border);border-radius:var(--_comark-radius);background:color-mix(in srgb,var(--_comark-foreground) 4%,transparent)}",
  // A dark page paints an iframe white until its document, which declares no color scheme, matches the iframe's.
  ".ce-frame iframe{display:block;width:100%;height:100%;border:0;color-scheme:light}",
  ".ce[data-size='video'] .ce-frame{aspect-ratio:16/9}",
  ".ce[data-size='short'] .ce-frame{aspect-ratio:9/16;max-width:var(--ce-short-width);margin-inline:auto}",
  // Spotify draws its own rounded card at these heights.
  ".ce[data-size='compact'] .ce-frame{height:152px;border:0;background:none}",
  ".ce[data-size='list'] .ce-frame{height:352px;border:0;background:none}",
  ".ce[data-size='app'] .ce-frame{height:var(--ce-app-height)}",
  // X draws its own card, 550px at most, and reports its height to the script, which sets it on the iframe.
  ".ce[data-size='post'] .ce-frame{max-width:var(--ce-post-width);margin-inline:auto;border:0;background:none}",
  ".ce[data-size='post'] iframe{height:var(--ce-post-height)}",
  ".ce figcaption{margin-top:.75rem;color:var(--_comark-muted);font-size:.875rem;line-height:1.25rem;overflow-wrap:anywhere}",
  ".ce:is([data-size='short'],[data-size='post']) figcaption{text-align:center}",
  ".ce figcaption a{border-radius:calc(var(--_comark-radius) - 4px);color:inherit;text-decoration:none;text-underline-offset:4px;transition:color .15s}",
  ".ce figcaption a:hover{color:var(--_comark-foreground);text-decoration:underline}",
  // Inline, so the icon follows the last word of a title that wraps.
  ".ce figcaption svg{display:inline-block;width:.875rem;height:.875rem;margin-inline-start:.375rem;vertical-align:-.125em}",
  ".ce:dir(rtl) figcaption svg{scale:-1 1}",
  ".ce-card{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;column-gap:.75rem;margin:1rem 0;padding:.75rem 1rem;border:1px solid var(--_comark-border);border-radius:var(--_comark-radius);background:var(--_comark-background);color:var(--_comark-foreground);font:400 .875rem/1.25rem var(--_comark-font);text-decoration:none;transition:background-color .15s}",
  ".ce-card:hover{background:color-mix(in srgb,var(--_comark-accent) 50%,var(--_comark-background))}",
  ".ce figcaption a:focus-visible,.ce-card:focus-visible{outline:none;box-shadow:0 0 0 3px color-mix(in srgb,var(--_comark-ring) 50%,transparent)}",
  ".ce-card svg{grid-row:span 2;box-sizing:border-box;width:2rem;height:2rem;padding:calc(.5rem - 1px);border:1px solid var(--_comark-border);border-radius:calc(var(--_comark-radius) - 2px);background:var(--_comark-accent);color:var(--_comark-muted)}",
  // Two lines of a title are enough to recognize it, but the host shows in full: it's how a reader judges where the
  // link goes.
  ".ce-card strong{display:-webkit-box;overflow:hidden;-webkit-box-orient:vertical;-webkit-line-clamp:2;font-weight:500;overflow-wrap:anywhere}",
  ".ce-card span{color:var(--_comark-muted);overflow-wrap:anywhere}",
  // Paper can't play anything, and a lazy player off screen prints as an empty frame, so print where each link goes.
  "@media print{.ce-frame,.ce figcaption svg{display:none}.ce figcaption{margin-top:0}.ce figcaption a::after{content:' (' attr(href) ')'}.ce-card span{display:none}.ce-card::after{content:attr(href);color:var(--_comark-muted);overflow-wrap:anywhere}.ce,.ce-card{break-inside:avoid}}",
].join("")}}`;
