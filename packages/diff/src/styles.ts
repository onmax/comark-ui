import { theme } from "comark-zoom/theme";

export const css = `@layer comark{${[
  theme(".cd", "status"),
  ":where(.cd){--cd-red:var(--_comark-danger);--cd-green:var(--_comark-success);margin:1.5rem 0}",
  // A diff reads like a suggested change in a GitHub review, framed like shadcn/ui's Card: the file and its counts in a
  // quiet header, removed lines red, added lines green, and the words that changed within a pair of lines a shade
  // deeper. Tints are translucent and text colors are mixed with the foreground, so wherever the `--comark-*` tokens
  // turn dark, a `.dark` class included, the diff turns with them.
  ".cd{overflow:hidden;border:1px solid var(--_comark-border);border-radius:var(--_comark-radius);background:var(--_comark-background);color:var(--_comark-foreground)}",
  // On a narrow page the file drops under the label and wraps, rather than lose the end of its name.
  ".cd>figcaption{display:flex;flex-wrap:wrap;gap:.125rem .5rem;align-items:flex-start;margin:0;padding:.5rem .75rem;border-bottom:1px solid var(--_comark-border);background:color-mix(in srgb,var(--_comark-accent) 50%,var(--_comark-background));font:.8125rem/1.25rem var(--_comark-font)}",
  ".cd-icon{flex:none;width:1rem;height:1rem;margin:.125rem 0;color:var(--_comark-muted);fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}",
  ".cd-label{font-weight:500}",
  ".cd-file,.cd-counts{font:.75rem/1.25rem var(--cd-font,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace)}",
  ".cd-file{flex:1 1 12rem;min-width:0;color:var(--_comark-muted);overflow-wrap:anywhere}",
  ".cd-counts{display:flex;flex:none;gap:.375rem;margin-left:auto;font-weight:500;font-variant-numeric:tabular-nums}",
  // As much of each color as keeps 4.5:1 on the header, light or dark, whichever of its two shades the system picked.
  ".cd-added,.cd-add .cd-line::before{color:color-mix(in oklab,var(--cd-green) 60%,var(--_comark-foreground))}",
  ".cd-removed,.cd-del .cd-line::before{color:color-mix(in oklab,var(--cd-red) 70%,var(--_comark-foreground))}",
  // A long line scrolls instead of wrapping, so it stays beside its number.
  ".cd-scroll{overflow-x:auto;padding:.25rem 0;scrollbar-width:thin}",
  ".cd-scroll:focus-visible{outline:2px solid var(--_comark-ring);outline-offset:-2px}",
  ".cd-code{width:100%;margin:0;border:0;border-collapse:collapse;background:none;font:.8125rem/1.375rem var(--cd-font,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);tab-size:2}",
  ".cd-code td{padding:0;border:0;vertical-align:top}",
  ".cd-code .cd-num{width:1%;padding:0 .375rem 0 .75rem;color:var(--_comark-muted);text-align:right;white-space:nowrap;-webkit-user-select:none;user-select:none}",
  ".cd-num::before{content:attr(data-line)}",
  ".cd-code .cd-line{padding-right:1rem;white-space:pre}",
  // The marker also gives an empty line its height.
  ".cd-line::before{content:' ';display:inline-block;width:1.75em;text-align:center;-webkit-user-select:none;user-select:none}",
  ".cd-del .cd-line::before{content:'−'}",
  ".cd-add .cd-line::before{content:'+'}",
  ".cd-del{background:color-mix(in srgb,var(--cd-red) 10%,transparent)}",
  ".cd-add{background:color-mix(in srgb,var(--cd-green) 12%,transparent)}",
  // The numbers of a changed line sit a shade deeper, as on GitHub.
  ".cd-del .cd-num{background:color-mix(in srgb,var(--cd-red) 8%,transparent)}",
  ".cd-add .cd-num{background:color-mix(in srgb,var(--cd-green) 8%,transparent)}",
  ".cd-code :is(del,ins){color:inherit;text-decoration:none}",
  ".cd-code del{background:color-mix(in srgb,var(--cd-red) 30%,transparent)}",
  ".cd-code ins{background:color-mix(in srgb,var(--cd-green) 30%,transparent)}",
  // A highlighted line keeps its row's color under a neutral wash, with a bar on its edge.
  ".cd-code [data-highlight]{background-image:linear-gradient(color-mix(in srgb,var(--_comark-foreground) 6%,transparent) 0 0)}",
  ".cd-code [data-highlight]>:first-child{box-shadow:inset 2px 0 var(--_comark-ring)}",
].join("")}}`;
