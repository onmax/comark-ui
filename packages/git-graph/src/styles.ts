import { dark, theme } from "comark-zoom/theme";

const MONO = "var(--cgg-font,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace)";
// Seven lane colors, the trunk's a neutral one. Each lane keeps its color down the graph, and the pills and dots of a
// branch share it.
const LIGHT = [
  "color-mix(in oklab,var(--_comark-foreground) 70%,var(--_comark-background))",
  "oklch(.56 .2 293)",
  "oklch(.6 .13 237)",
  "oklch(.6 .2 355)",
  "oklch(.58 .1 190)",
  "oklch(.52 .17 265)",
  "oklch(.58 .2 320)",
];
const DARK = [
  "color-mix(in oklab,var(--_comark-foreground) 80%,var(--_comark-background))",
  "oklch(.74 .15 293)",
  "oklch(.76 .11 237)",
  "oklch(.75 .15 355)",
  "oklch(.77 .09 190)",
  "oklch(.72 .13 265)",
  "oklch(.75 .15 320)",
];
const lanes = (colors: string[]) => colors.map((color, i) => `--cgg-l${i}:${color}`).join(";");

/**
 * A commit graph framed like shadcn/ui's Card, as `::diff` is: a quiet header with the title and counts, the graph as
 * a narrow gutter of lines and dots beside rows of commit text, and a legend. Rows have a fixed height, since the
 * parse plugin draws the lines to meet them. The rules sit in the `comark` layer, so any unlayered rule of the host's
 * wins.
 */
export const css = `@layer comark{${[
  theme(".cgg", "status"),
  `:where(.cgg){${lanes(LIGHT)};margin:1.5rem 0}`,
  dark(".cgg", lanes(DARK)),
  ".cgg{position:relative;overflow:hidden;border:1px solid var(--_comark-border);border-radius:var(--_comark-radius);background:var(--_comark-background);color:var(--_comark-foreground);font:.8125rem/1.25rem var(--_comark-font)}",
  ".cgg-head{display:flex;align-items:baseline;gap:.625rem;padding:.625rem .875rem;border-bottom:1px solid var(--_comark-border);background:color-mix(in srgb,var(--_comark-accent) 50%,var(--_comark-background))}",
  ".cgg-title{min-width:0;font-weight:500;overflow-wrap:anywhere}",
  ".cgg-count{margin-left:auto;color:var(--_comark-muted);font-size:.75rem;font-variant-numeric:tabular-nums;white-space:nowrap}",
  ".cgg-graph{display:flex;padding:.375rem 0}",
  ".cgg-lines{flex:none;line-height:0}",
  ".cgg-lines svg{display:block;max-width:none;margin:0;overflow:visible}",
  ".cgg-rows{flex:1;min-width:0}",
  // The parse plugin draws each dot at the middle of a 34px row, or a 52px one with a line of notes.
  ".cgg-row{box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;gap:2px;height:34px;padding-right:.875rem}",
  ".cgg-row[data-notes]{height:52px}",
  ".cgg-row:hover{background:color-mix(in srgb,var(--_comark-accent) 60%,transparent)}",
  ".cgg-line,.cgg-notes{display:flex;align-items:center;gap:.5rem;min-width:0;white-space:nowrap}",
  ".cgg-subject{min-width:0;overflow:hidden;text-overflow:ellipsis}",
  ".cgg-muted{color:var(--_comark-muted)}",
  `.cgg-ref,.cgg-sha{color:var(--_comark-muted);font:.75rem/1 ${MONO}}`,
  ".cgg-sha{flex:none;margin-left:auto;padding-left:.5rem}",
  `.cgg-branch,.cgg-tag{display:inline-block;flex:none;box-sizing:border-box;max-width:14rem;height:1.25rem;padding:0 .4375rem;border-radius:min(calc(var(--_comark-radius) - 4px),.375rem);font:500 .75rem/1.125rem ${MONO};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}`,
  ".cgg-branch{border:1px solid var(--_comark-border);background:var(--_comark-background)}",
  ".cgg-branch::before,.cgg-tag::before{content:'';display:inline-block;margin-right:.3125rem;vertical-align:-1px}.cgg-branch::before{width:7px;height:7px;border-radius:50%;background:var(--cgg-lane)}",
  ".cgg-branch[data-deleted]{border-style:dashed;color:var(--_comark-muted)}",
  ".cgg-tag{padding:0 .375rem;background:var(--_comark-accent)}",
  // Lucide's tag icon, as a mask over the muted color.
  `.cgg-tag::before{width:.75rem;height:.75rem;vertical-align:-2px;background:var(--_comark-muted);-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z'/%3E%3Ccircle cx='7.5' cy='7.5' r='1.2'/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z'/%3E%3Ccircle cx='7.5' cy='7.5' r='1.2'/%3E%3C/svg%3E") center/contain no-repeat}`,
  ".cgg-notes{gap:.875rem;overflow:hidden;color:var(--_comark-muted);font-size:.75rem;line-height:1rem}",
  `.cgg-note b{color:var(--_comark-foreground);font:500 .75rem/1 ${MONO}}`,
  ".cgg-note,.cgg-key{display:inline-flex;align-items:center;gap:.375rem}",
  ".cgg-note::before,.cgg-key::before{content:'';flex:none;box-sizing:border-box;width:.5rem;height:.5rem;border-radius:50%;background:var(--cgg-status)}",
  ".cgg [data-status='clean']{--cgg-status:color-mix(in oklab,var(--_comark-success) 88%,var(--_comark-foreground))}",
  ".cgg [data-status='conflict']{--cgg-status:color-mix(in oklab,var(--_comark-warning) 85%,var(--_comark-foreground))}",
  ".cgg-key[data-status='has']::before{border:1.5px solid var(--_comark-muted);background:none}",
  ".cgg-key[data-status='elided']::before{width:.25rem;height:.75rem;border-radius:0;background:radial-gradient(circle,var(--_comark-muted) 1.2px,transparent 1.5px) center/4px 4px repeat-y}",
  ".cgg-legend{display:flex;flex-wrap:wrap;gap:.25rem .875rem;padding:.5rem .875rem;border-top:1px solid var(--_comark-border);color:var(--_comark-muted);font-size:.75rem}",
  ".cgg-footer{padding:.75rem .875rem;border-top:1px solid var(--_comark-border)}",
  ".cgg-footer>:first-child{margin-top:0}.cgg-footer>:last-child{margin-bottom:0}",
  ".cgg-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}",
  ...Array.from(
    { length: LIGHT.length },
    (_, i) => `.cgg [data-lane='${i}'],.cgg .cgg-l${i}{--cgg-lane:var(--cgg-l${i})}`,
  ),
  ".cgg-edges path{fill:none;stroke:var(--cgg-lane);stroke-width:2;stroke-linecap:round}",
  ".cgg-commit{fill:var(--cgg-lane);stroke:var(--_comark-background);stroke-width:2}",
  ".cgg-merge{fill:var(--_comark-background);stroke:var(--cgg-lane);stroke-width:2}",
  ".cgg-gap{fill:var(--_comark-background)}.cgg-ellipsis{fill:var(--cgg-lane)}",
  ".cgg-has{fill:var(--_comark-background);stroke:var(--_comark-muted);stroke-width:1.5}",
  ".cgg-pick circle{fill:var(--cgg-status);stroke:var(--_comark-background);stroke-width:2}",
  ".cgg-pick text{fill:var(--_comark-background);font:600 10px/1 var(--_comark-font);font-variant-numeric:tabular-nums;text-anchor:middle;dominant-baseline:central}",
].join("")}}`;
