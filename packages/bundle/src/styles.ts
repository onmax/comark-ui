import { dark, theme } from "comark-zoom/theme";
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";
const hatch = (color: string, width = 3) =>
  `repeating-linear-gradient(135deg,color-mix(in srgb,${color} 38%,transparent) 0 ${width}px,color-mix(in srgb,${color} 8%,transparent) ${width}px ${width * 2}px)`;
// Lucide's package icon, as a mask over the muted color.
const ICON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z'/%3E%3Cpath d='M12 22V12'/%3E%3Cpath d='m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7'/%3E%3Cpath d='m7.5 4.27 9 5.15'/%3E%3C/svg%3E") center/contain no-repeat`;
/**
 * A bundle report framed like shadcn/ui's chart Card: the title in a quiet header, one big number with its change, a
 * bar per build in neutrals where what the new build added is dark and what it dropped is hatched, and a muted footer,
 * with a treemap of what the build holds behind a native `<details>`. The rules sit in the `comark` layer, so any unlayered rule of the host's wins.
 */
export const css = `@layer comark{${[
  theme(".cbr", "status"),
  ":where(.cbr){--cbr-better:color-mix(in oklab,var(--_comark-success) 80%,var(--_comark-foreground));--cbr-worse:color-mix(in oklab,var(--_comark-danger) 82%,var(--_comark-foreground));--cbr-rest:color-mix(in srgb,var(--_comark-foreground) 16%,var(--_comark-background));--cbr-ink:color-mix(in srgb,var(--_comark-foreground) 78%,var(--_comark-background));--cbr-text:color-mix(in srgb,var(--_comark-foreground) 72%,var(--_comark-background));--cbr-tile:color-mix(in srgb,var(--_comark-foreground) 6%,var(--_comark-background));margin:1.5rem 0}",
  dark(
    ".cbr",
    "--cbr-better:color-mix(in oklab,var(--_comark-success) 90%,var(--_comark-foreground));--cbr-worse:color-mix(in oklab,var(--_comark-danger) 90%,var(--_comark-foreground));--cbr-rest:color-mix(in srgb,var(--_comark-foreground) 20%,var(--_comark-background));--cbr-ink:color-mix(in srgb,var(--_comark-foreground) 82%,var(--_comark-background));--cbr-tile:color-mix(in srgb,var(--_comark-foreground) 8%,var(--_comark-background))",
  ),
  ".cbr{position:relative;overflow:hidden;border:1px solid var(--_comark-border);border-radius:var(--_comark-radius);background:var(--_comark-background);color:var(--_comark-foreground);font:.8125rem/1.25rem var(--_comark-font);font-variant-numeric:tabular-nums}",
  // The header: the icon and the title.
  ".cbr-head{display:flex;align-items:center;gap:.625rem;padding:.625rem .875rem;border-bottom:1px solid var(--_comark-border);background:color-mix(in srgb,var(--_comark-accent) 50%,var(--_comark-background))}",
  `.cbr-head::before{content:'';flex:none;width:1rem;height:1rem;background:var(--_comark-muted);-webkit-mask:${ICON};mask:${ICON}}`,
  ".cbr-title{min-width:0;font-weight:500;overflow-wrap:anywhere}",
  ".cbr-panel{padding:.875rem}",
  // Changes: one number, a bar per build.
  ".cbr-top{display:flex;align-items:center;gap:.5rem}",
  ".cbr-big{font-size:1.875rem;line-height:2.25rem;font-weight:700;letter-spacing:-.02em}",
  ".cbr-pill{padding:.0625rem .4375rem;border-radius:999px;font-size:.75rem;font-weight:500;line-height:1.125rem}",
  ".cbr-pill[data-verdict=better]{background:color-mix(in srgb,var(--_comark-success) 14%,transparent);color:var(--cbr-better)}",
  ".cbr-pill[data-verdict=worse]{background:color-mix(in srgb,var(--_comark-danger) 14%,transparent);color:var(--cbr-worse)}",
  ".cbr-pill[data-verdict=same]{background:var(--_comark-accent);color:var(--_comark-muted)}",
  ".cbr-sub{color:var(--cbr-text)}",
  ".cbr-bars{display:grid;gap:.5rem;margin-top:1rem}",
  ".cbr-bar{display:grid;grid-template-columns:2.75rem minmax(0,1fr);gap:.5rem;align-items:start}",
  ".cbr-bar-l{color:var(--cbr-text);font-size:.75rem;line-height:1.5rem}",
  ".cbr-track{display:flex;gap:1px;height:1.5rem}",
  `.cbr-seg{box-sizing:border-box;display:flex;align-items:center;min-width:2px;overflow:hidden;padding:0 .375rem;border-radius:3px;background:var(--cbr-rest);color:var(--_comark-background);font:500 .6875rem/1 ${MONO};white-space:nowrap;text-overflow:ellipsis}`,
  ".cbr-seg[data-kind=rest]{padding:0}",
  `.cbr-seg[data-kind=removed],.cbr-seg[data-kind=moved-out]{background:${hatch("var(--_comark-foreground)")};box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--_comark-foreground) 45%,transparent);color:var(--_comark-foreground)}`,
  ".cbr-seg[data-kind=added],.cbr-seg[data-kind=moved-in]{background:var(--cbr-ink);color:var(--_comark-background)}",
  ".cbr-names{position:relative;display:block}",
  `.cbr-name{position:absolute;padding-top:.125rem;color:var(--cbr-text);font:500 .75rem/1rem ${MONO};white-space:nowrap}`,
  // Contents: a treemap of every page and of what loads later.
  ".cbr-map{display:flex;gap:.625rem}",
  ".cbr-sub+.cbr-map{margin-top:1rem}",
  ".cbr-group{min-width:0}",
  ".cbr-group-l{margin-bottom:.375rem;color:var(--_comark-muted);font-size:.75rem;line-height:1rem}",
  ".cbr-tiles{position:relative;height:12.5rem}",
  `.cbr-tile{position:absolute;box-sizing:border-box;overflow:hidden;padding:.3125rem .4375rem;border:1.5px solid var(--_comark-background);border-radius:.375rem;background:var(--cbr-tile);font:500 .6875rem/1rem ${MONO};white-space:nowrap;text-overflow:ellipsis}`,
  ".cbr-tile[data-kind=rest]{background:color-mix(in srgb,var(--_comark-foreground) 3%,var(--_comark-background));color:var(--cbr-text);font-weight:400}",
  ".cbr-tile[data-kind=added],.cbr-tile[data-kind=moved-in]{background:var(--cbr-ink);color:var(--_comark-background)}",
  ".cbr-tile[data-kind=changed]{background:color-mix(in srgb,var(--_comark-foreground) 14%,var(--_comark-background))}",
  `.cbr-tile[data-kind=removed]{background:${hatch("var(--_comark-foreground)", 4)};box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--_comark-foreground) 45%,transparent);text-decoration:line-through;text-decoration-color:var(--cbr-text)}`,
  ".cbr-tile[data-kind=moved-out]{background:none;border-style:dashed;border-color:color-mix(in srgb,var(--_comark-foreground) 40%,transparent);color:var(--cbr-text)}",
  // What the build holds, behind a native disclosure.
  ".cbr-more{border-top:1px solid var(--_comark-border)}",
  ".cbr-more>summary{display:flex;align-items:baseline;gap:.5rem;padding:.75rem .875rem;cursor:pointer;font-weight:500;list-style:none}",
  ".cbr-more:not([open])>summary{border-radius:0 0 var(--_comark-radius) var(--_comark-radius)}",
  ".cbr-more>summary::-webkit-details-marker{display:none}",
  ".cbr-more>summary::before{content:'';align-self:center;flex:none;width:.375rem;height:.375rem;margin:0 .125rem;border:solid var(--_comark-muted);border-width:0 1.5px 1.5px 0;transform:rotate(-45deg);transition:transform .15s}",
  ".cbr-more[open]>summary::before{transform:rotate(45deg)}",
  "@media (hover:hover){.cbr-more>summary:hover{background:color-mix(in srgb,var(--_comark-accent) 50%,transparent)}}",
  ".cbr-more>summary:focus-visible{outline:2px solid var(--_comark-ring);outline-offset:-2px}",
  ".cbr-count{color:var(--_comark-muted);font-weight:400}",
  ".cbr-more-body{display:grid;gap:.625rem;padding:0 .875rem .875rem}",
  // The footer: one sentence, then a muted line.
  ".cbr-foot{display:grid;gap:.25rem;margin-top:.875rem}",
  // The change in words is for screen readers: the badge and the names under the bars already say it.
  ".cbr-foot-1{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}",
  ".cbr-foot-2{color:var(--_comark-muted);font-size:.75rem;line-height:1rem}",
  "@media (max-width:30rem){.cbr-map{flex-direction:column}.cbr-group{flex:none!important}}",
  "@media (prefers-reduced-motion:reduce){.cbr-more>summary::before{transition:none}}",
].join("")}}`;
