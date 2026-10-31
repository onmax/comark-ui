import { theme } from "comark-zoom/theme";

// A checkerboard under the color, so a translucent one shows as translucent. Its squares are mixed from the tokens, so
// it darkens with the page.
const fill =
  "background:linear-gradient(var(--cco),var(--cco)),repeating-conic-gradient(color-mix(in srgb,var(--_comark-muted) 35%,var(--_comark-background)) 0 25%,var(--_comark-background) 0 50%) 0 0/8px 8px";

/**
 * A swatch inside inline code, and palettes as a grid of tiles in the style of shadcn/ui's Card, on the shared
 * `--comark-*` tokens. Override `--cco-tile-width` and `--cco-tile-height` to size a palette's tiles. The rules sit in
 * the `comark` layer, so any unlayered rule of the host's wins.
 */
export const css = `@layer comark{${[
  theme(".cco-palette,.cco"),
  ":where(.cco-palette){--cco-tile-width:9rem;--cco-tile-height:4rem}",
  // Ems, so the swatch follows the code's own size, and inline, so it wraps with the color it shows.
  `.cco-swatch{display:inline-block;box-sizing:border-box;width:.8em;height:.8em;margin-inline-end:.35em;vertical-align:-.05em;border:1px solid var(--_comark-border);border-radius:calc(var(--_comark-radius) - 7px);${fill}}`,
  ".cco-palette{display:grid;grid-template-columns:repeat(auto-fill,minmax(var(--cco-tile-width),1fr));gap:.75rem;margin:1.5rem 0;padding:0;list-style:none;font-family:var(--_comark-font)}",
  // A page's list item margins and paddings, almost always unlayered, would stagger the grid's rows (`li+li`) and inset
  // the tile's color, and only `!important` beats them.
  ".cco-palette>li{margin:0!important;padding:0!important;overflow:hidden;border:1px solid var(--_comark-border);border-radius:var(--_comark-radius);background:var(--_comark-background);color:var(--_comark-foreground)}",
  `.cco-tile{display:block;height:var(--cco-tile-height);border-bottom:1px solid var(--_comark-border);${fill}}`,
  // Spans rather than strong and code, so a page's own prose styles for those don't reach into the tile.
  ".cco-name,.cco-value{display:block;padding:0 .75rem;line-height:1.25rem;overflow-wrap:anywhere}",
  ".cco-name{padding-top:.5rem;font-size:.875rem;font-weight:500}",
  ".cco-value{padding-bottom:.5rem;color:var(--_comark-muted);font:.75rem/1.25rem ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}",
  // Browsers drop backgrounds when printing unless told, and a swatch is nothing but its background.
  ".cco-swatch,.cco-tile{-webkit-print-color-adjust:exact;print-color-adjust:exact}",
  "@media print{.cco-palette>li{break-inside:avoid}}",
].join("")}}`;
