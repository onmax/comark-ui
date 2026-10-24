import { theme } from "comark-zoom/theme";

/**
 * A table that scrolls sideways in place, with a bar of copy buttons above it and headers that sort, on the shared
 * `--comark-*` tokens. The buttons and sort arrows only show once the script runs. The rules sit in the `comark` layer,
 * so any unlayered rule of the host's wins.
 */
export const css = `@layer comark{${[
  theme(".ctb"),
  ".ctb{margin:1.5rem 0}",
  ".ctb-scroll{overflow-x:auto}",
  ".ctb-scroll>table{margin:0}",
  ".ctb-bar{display:flex;align-items:center;justify-content:flex-end;gap:.25rem;margin-bottom:.375rem;font:500 .75rem/1rem var(--_comark-font)}",
  "html:not([data-table-ready]) .ctb-bar{display:none}",
  ".ctb-bar button{display:inline-flex;align-items:center;gap:.375rem;height:1.75rem;padding:0 .5rem;border:1px solid var(--_comark-border);border-radius:calc(var(--_comark-radius) - 4px);background:var(--_comark-background);color:var(--_comark-muted);font:inherit;cursor:pointer;transition:background-color .15s,color .15s}",
  ".ctb-bar button:hover{background:var(--_comark-accent);color:var(--_comark-foreground)}",
  ".ctb-bar svg{width:.875rem;height:.875rem}",
  ".ctb-status{margin-inline-end:.25rem;color:var(--_comark-muted)}",
  // Before the script runs, a sort button reads as the header's text.
  ".ctb-sort{all:unset}",
  // A page's plain `button` rules would turn each header into a boxed button, and they beat any layered rule.
  ".ctb-sort{margin:0!important;padding:0!important;border:0!important;background:none!important;box-shadow:none!important;font:inherit!important;color:inherit!important;text-align:inherit!important}",
  "html[data-table-ready] .ctb-sort{display:inline-flex;align-items:center;gap:.25rem;cursor:pointer}",
  "html[data-table-ready] .ctb-sort::after{content:'↕';color:var(--_comark-muted);font-weight:400}",
  "html[data-table-ready] [aria-sort='ascending']>.ctb-sort::after{content:'↑';color:inherit}",
  "html[data-table-ready] [aria-sort='descending']>.ctb-sort::after{content:'↓';color:inherit}",
  ".ctb-bar button:focus-visible{outline:none;box-shadow:0 0 0 3px color-mix(in srgb,var(--_comark-ring) 50%,transparent)}",
  ".ctb-sort:focus-visible{outline:none;border-radius:calc(var(--_comark-radius) - 4px);box-shadow:0 0 0 3px color-mix(in srgb,var(--_comark-ring) 50%,transparent)!important}",
  "@media print{.ctb-bar{display:none}.ctb-sort::after{content:none!important}}",
].join("")}}`;
