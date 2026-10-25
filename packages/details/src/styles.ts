import { theme } from "comark-zoom/theme";

/**
 * Details and accordion items in a bordered box with a chevron that turns as they open, and collapsibles as a quiet
 * "Show properties" line, on the shared `--comark-*` tokens. The rules sit in the `comark` layer, so any unlayered
 * rule of the host's wins.
 */
export const css = `@layer comark{${[
  theme(".cdt,.cdt-accordion"),
  // A page's `details` and `summary` padding would knock the summary out of line with the box's edges, and its margins
  // would split an accordion apart, so the spacing that draws the box is `!important`.
  ".cdt{margin:1rem 0;padding:0 1rem!important;border:1px solid var(--_comark-border);border-radius:var(--_comark-radius);background:var(--_comark-background)}",
  ".cdt[open]{padding-bottom:1rem!important}",
  ".cdt-accordion{margin:1.5rem 0;border:1px solid var(--_comark-border);border-radius:var(--_comark-radius);background:var(--_comark-background)}",
  ".cdt-accordion>.cdt{margin:0!important;border:0;border-bottom:1px solid var(--_comark-border);border-radius:0;background:none}",
  ".cdt-accordion>.cdt:last-child{border-bottom:0}",
  ".cdt-summary{display:flex;align-items:center;gap:.5rem;margin:0 -1rem!important;padding:.75rem 1rem!important;border-radius:var(--_comark-radius);color:var(--_comark-foreground);font:500 .9375rem/1.5rem var(--_comark-font);list-style:none;cursor:pointer}",
  ".cdt-summary::-webkit-details-marker{display:none}",
  ".cdt-summary:focus-visible{outline:none;box-shadow:0 0 0 3px color-mix(in srgb,var(--_comark-ring) 50%,transparent)}",
  ".cdt-summary .ci{flex:none;font-size:1rem;color:var(--_comark-muted)}",
  ".cdt-summary::after{content:'';flex:none;box-sizing:border-box;width:.5rem;height:.5rem;margin-inline-start:auto;border:solid var(--_comark-muted);border-width:0 1.5px 1.5px 0;rotate:45deg;translate:0 -.125rem;transition:rotate .2s,translate .2s}",
  ".cdt[open]>.cdt-summary::after{rotate:225deg;translate:0 .125rem}",
  // A page's paragraph and list margins are almost always unlayered, so only `!important` keeps them from opening a gap
  // under the summary or above the box's bottom edge.
  ".cdt>.cdt-summary+*{margin-top:0!important}",
  ".cdt>:last-child{margin-bottom:0!important}",
  ".cdt[data-variant='collapsible']{padding:0!important;border:0;background:none}",
  ".cdt[data-variant='collapsible']>.cdt-summary{display:inline-flex;gap:.375rem;margin:0!important;padding:.25rem 0!important;color:var(--_comark-muted);font-size:.875rem}",
  ".cdt[data-variant='collapsible']>.cdt-summary:hover{color:var(--_comark-foreground)}",
  ".cdt[data-variant='collapsible']>.cdt-summary::after{margin-inline-start:.25rem}",
  // The words come from attributes, so the summary reads "properties" alone where the styles don't load.
  ".cdt-toggle::before{content:attr(data-show)}",
  ".cdt[open]>.cdt-summary .cdt-toggle::before{content:attr(data-hide)}",
  ".cdt[data-variant='collapsible']>.cdt-summary+*{margin-top:.5rem!important}",
  // The content slides open from 0 to its own height, where the browser can interpolate to `auto`; elsewhere it opens
  // at once, as before.
  "@supports (interpolate-size:allow-keywords) and selector(::details-content){@media (prefers-reduced-motion:no-preference){" +
    ".cdt{interpolate-size:allow-keywords;transition:padding-bottom .25s cubic-bezier(.23,1,.32,1)}" +
    ".cdt::details-content{block-size:0;overflow-y:clip;transition:block-size .25s cubic-bezier(.23,1,.32,1),content-visibility .25s allow-discrete}" +
    ".cdt[open]::details-content{block-size:auto}}}",
  "@media (prefers-reduced-motion:reduce){.cdt-summary::after{transition:none}}",
  "@media print{.cdt-summary::after{display:none}}",
].join("")}}`;
