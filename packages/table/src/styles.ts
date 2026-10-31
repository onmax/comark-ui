import { theme } from "comark-zoom/theme";

/**
 * A table that scrolls sideways in place, with a Copy button and a menu of formats above it and headers that sort, on the shared
 * `--comark-*` tokens. The buttons and sort arrows only show once the script runs. The rules sit in the `comark` layer,
 * so any unlayered rule of the host's wins.
 */
export const css = `@layer comark{${[
  theme(".ctb", "shadow"),
  ".ctb{margin:1.5rem 0}",
  ".ctb-scroll{overflow-x:auto}",
  ".ctb-scroll>table{margin:0}",
  ".ctb-bar{display:flex;align-items:center;justify-content:flex-end;gap:.25rem;margin-bottom:.375rem;font:500 .75rem/1rem var(--_comark-font)}",
  "html:not([data-table-ready]) .ctb-bar{display:none}",
  ".ctb-copy{position:relative;display:inline-flex;border:1px solid var(--_comark-border);border-radius:calc(var(--_comark-radius) - 4px);background:var(--_comark-background)}",
  ".ctb-copy>button{display:inline-grid;place-items:center;height:1.625rem;padding:0;border:0;background:none;color:var(--_comark-muted);font:inherit;cursor:pointer;transition:background-color .15s,color .15s}",
  ".ctb-copy-main{width:1.75rem;border-radius:calc(var(--_comark-radius) - 5px) 0 0 calc(var(--_comark-radius) - 5px)}",
  ".ctb-copy>.ctb-copy-more{width:1.25rem;border-inline-start:1px solid var(--_comark-border);border-radius:0 calc(var(--_comark-radius) - 5px) calc(var(--_comark-radius) - 5px) 0}",
  ".ctb-copy-more svg{width:.75rem;height:.75rem}",
  ".ctb-copy-more[aria-expanded=true]{background:var(--_comark-accent);color:var(--_comark-foreground)}",
  "@media (hover:hover){.ctb-copy>button:hover,.ctb-menu button:hover{background:var(--_comark-accent);color:var(--_comark-foreground)}}",
  ".ctb-copy-main svg+svg,.ctb-copy-main[data-state=done] svg:first-child{display:none}",
  ".ctb-copy-main[data-state=done] svg+svg{display:block}",
  // Over the table, not in the bar, so a menu never pushes the table down.
  ".ctb-menu{position:absolute;top:calc(100% + .25rem);right:-1px;z-index:10;display:grid;min-width:15rem;padding:.25rem;border:1px solid var(--_comark-border);border-radius:var(--_comark-radius);background:var(--_comark-background);box-shadow:var(--_comark-shadow)}",
  ".ctb-menu[hidden]{display:none}",
  ".ctb-menu button{display:grid;grid-template-columns:.875rem 1fr;gap:.5rem;align-items:start;padding:.375rem .5rem;border:0;border-radius:calc(var(--_comark-radius) - 4px);background:none;color:var(--_comark-foreground);font:inherit;text-align:start;cursor:pointer}",
  ".ctb-menu button:focus-visible{outline:none;background:var(--_comark-accent)}",
  ".ctb-menu svg{margin-top:.125rem}",
  ".ctb-menu b{display:block;font-weight:500}",
  ".ctb-menu small{display:block;color:var(--_comark-muted);font-size:.75rem;font-weight:400;line-height:1rem}",
  ".ctb-status{margin-inline-end:.25rem;color:var(--_comark-muted)}",
  // Before the script runs, a sort button reads as the header's text.
  ".ctb-sort{all:unset}",
  // A page's plain `button` rules would turn each header into a boxed button, and they beat any layered rule.
  ".ctb-sort{margin:0!important;padding:0!important;border:0!important;background:none!important;box-shadow:none!important;font:inherit!important;color:inherit!important;text-align:inherit!important}",
  "html[data-table-ready] .ctb-sort{display:inline-flex;align-items:center;gap:.25rem;cursor:pointer}",
  "html[data-table-ready] .ctb-sort::after{content:'↕';color:var(--_comark-muted);font-weight:400}",
  "html[data-table-ready] [aria-sort='ascending']>.ctb-sort::after{content:'↑';color:inherit}",
  "html[data-table-ready] [aria-sort='descending']>.ctb-sort::after{content:'↓';color:inherit}",
  ".ctb-copy>button:focus-visible{outline:none;box-shadow:0 0 0 3px color-mix(in srgb,var(--_comark-ring) 50%,transparent)!important}",
  ".ctb-sort:focus-visible{outline:none;border-radius:calc(var(--_comark-radius) - 4px);box-shadow:0 0 0 3px color-mix(in srgb,var(--_comark-ring) 50%,transparent)!important}",
  "@media print{.ctb-bar{display:none}.ctb-sort::after{content:none!important}}",
].join("")}}`;
