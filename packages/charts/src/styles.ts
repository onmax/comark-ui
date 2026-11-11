import { theme } from "comark-zoom/theme";
import { disclosureMotion } from "../../../shared/disclosure.ts";
import { INK, SERIES } from "./colors.ts";

// Rules of the host's stylesheet beat an SVG's presentation attributes, so each ink is swapped by its color.
const swap = (hex: string, color: string, props = ["fill", "stroke"]) =>
  props.map((prop) => `.cch-plot [${prop}="${hex}"]{${prop}:${color}}`).join("");

/**
 * A chart over its data table, on the shared `--comark-*` tokens. Series take `--comark-chart-1` to `-6`, then
 * Nuxt UI's `--ui-chart-1` to `-6`, then shadcn/ui's `--chart-1` to `-6`. The rules sit in the `comark` layer, so any unlayered rule of the host's wins.
 */
export const css = `@layer comark{${[
  disclosureMotion(".cch-data"),
  theme(".cch", "shadow"),
  // A section of a report, as a dashboard lays its charts out: a hairline over it, the title and what to read in it
  // at the start, the chart, and the data folded under it. No card, so charts sit in a column or a grid like text.
  ":where(.cch){--cch-padding:0}",
  ".cch{margin:2rem 0;padding:1rem var(--cch-padding) 0;border-top:1px solid var(--_comark-border);color:var(--_comark-foreground);font-family:var(--_comark-font)}",
  // Only the chart's own caption: a marked chart's notes sit in comark-annotate's figcaption inside it. A page's
  // typeset may center captions and mute them, as it does an image's.
  ".cch>figcaption{margin:0 0 1rem;color:var(--_comark-foreground);font-weight:500;font-size:.9375rem;line-height:1.375rem;text-align:start}",
  ".cch>figcaption:has(+.cch-description){margin-bottom:.125rem}",
  ".cch-description{max-width:46rem;margin:0 0 1rem;color:var(--_comark-muted);font-size:.8125rem;line-height:1.25rem}",
  // Every chart keeps the size its text was set for, and a narrower column shrinks it to fit, as it does a screenshot,
  // since marks sit at percentages of the SVG. Only the chart's own SVG: a mark's circle and arrow are SVGs too, and
  // `height:auto` would stretch them to their viewBox. A chart narrower than the column starts where its title does.
  ":is(.cch-plot,.cch-marked .ca-frame)>svg{display:block;max-width:100%;height:auto;margin-inline:0 auto}",
  ".cch-plot text{font-family:var(--_comark-font)}",
  // comark-annotate pins side notes to its stage's edges, so the stage is what's placed, with the notes' gutters
  // beside the chart rather than at the column's edges.
  ".cch-marked .ca-stage{box-sizing:border-box;width:fit-content;max-width:100%;margin-inline:0 auto}",
  ".cch-marked .ca-frame{width:fit-content;max-width:100%}",
  // A narrow column outlines a mark that draws nothing, which on a screenshot shows its area; on a chart it marks a
  // point, so it would be a broken ring under the letter, which marks the point alone.
  ".cch-marked .ca .ca-mark.ca-none{outline:none}",
  // A chart sits on the page, not on a screenshot, so a mark without a color takes the text's, and its number the page's.
  ".cch-marked .ca{--ca-color:var(--_comark-foreground);--ca-solid:var(--_comark-foreground);--ca-ink:var(--_comark-background)}",
  swap(INK.foreground, "var(--_comark-foreground)"),
  swap(INK.muted, "var(--_comark-muted)"),
  swap(INK.border, "var(--_comark-border)"),
  swap(INK.grid, "var(--_comark-border)"),
  // Flint's connectors between a waterfall's steps.
  swap("#6b7280", "var(--_comark-muted)"),
  // White fills are labels on a mark, which stay white; white strokes part slices and points from the page.
  swap(INK.background, "var(--_comark-background)", ["stroke"]),
  ...SERIES.map((hex, index) =>
    swap(
      hex,
      `var(--comark-chart-${index + 1},var(--ui-chart-${index + 1},var(--chart-${index + 1},${hex})))`,
    ),
  ),
  // The Copy bar sits over the section's top corner and shows on hover or focus, as a screenshot's Copy button does, so
  // a chart keeps its height. A screen with no hover always shows it.
  ".cch{position:relative}",
  ".cch-bar{position:absolute;top:.75rem;right:0;z-index:1;display:flex;align-items:center;gap:.25rem;font:500 .75rem/1rem var(--_comark-font);opacity:0;transition:opacity .15s}",
  "html:not([data-charts-ready]) .cch-bar{display:none}",
  ".cch:is(:hover,:focus-within)>.cch-bar,.cch-bar:has([aria-expanded=true],.cch-status:not(:empty)){opacity:1}",
  "@media (hover:none){.cch-bar{opacity:1}}",
  ".cch-status:not(:empty){padding:.125rem .375rem;border-radius:calc(var(--_comark-radius) - 4px);background:var(--_comark-background);color:var(--_comark-muted)}",
  ".cch-copy{position:relative;display:inline-flex;border:1px solid var(--_comark-border);border-radius:calc(var(--_comark-radius) - 4px);background:var(--_comark-background)}",
  ".cch-copy>button{display:inline-grid;place-items:center;height:1.625rem;padding:0;border:0;background:none;color:var(--_comark-muted);font:inherit;cursor:pointer;transition:background-color .15s,color .15s}",
  ".cch-copy-main{width:1.75rem;border-radius:calc(var(--_comark-radius) - 5px) 0 0 calc(var(--_comark-radius) - 5px)}",
  ".cch-copy>.cch-copy-more{width:1.25rem;border-inline-start:1px solid var(--_comark-border);border-radius:0 calc(var(--_comark-radius) - 5px) calc(var(--_comark-radius) - 5px) 0}",
  ".cch-copy-more svg{width:.75rem;height:.75rem}",
  ".cch-copy-more[aria-expanded=true]{background:var(--_comark-accent);color:var(--_comark-foreground)}",
  "@media (hover:hover){.cch-copy>button:hover,.cch-menu button:hover{background:var(--_comark-accent);color:var(--_comark-foreground)}}",
  ".cch-copy-main svg+svg,.cch-copy-main[data-state=done] svg:first-child{display:none}",
  ".cch-copy-main[data-state=done] svg+svg{display:block}",
  ".cch-copy>button:focus-visible{outline:none;box-shadow:0 0 0 3px color-mix(in srgb,var(--_comark-ring) 50%,transparent)}",
  ".cch-menu{position:absolute;top:calc(100% + .25rem);right:-1px;display:grid;min-width:15rem;padding:.25rem;border:1px solid var(--_comark-border);border-radius:var(--_comark-radius);background:var(--_comark-background);box-shadow:var(--_comark-shadow)}",
  ".cch-menu[hidden]{display:none}",
  ".cch-menu button{display:grid;grid-template-columns:.875rem 1fr;gap:.5rem;align-items:start;padding:.375rem .5rem;border:0;border-radius:calc(var(--_comark-radius) - 4px);background:none;color:var(--_comark-foreground);font:inherit;text-align:start;cursor:pointer}",
  ".cch-menu button:focus-visible{outline:none;background:var(--_comark-accent)}",
  ".cch-menu svg{margin-top:.125rem}",
  ".cch-menu b{display:block;font-weight:500}",
  ".cch-menu small{display:block;color:var(--_comark-muted);font-size:.75rem;font-weight:400;line-height:1rem}",
  ".cch-data{margin:.5rem 0 0;color:var(--_comark-muted);font-size:.8125rem;line-height:1.25rem}",
  ".cch-data summary{width:fit-content;cursor:pointer}",
  ".cch>table{margin-bottom:1.25rem}",
  ".cch-data summary:focus-visible{border-radius:calc(var(--_comark-radius) - 4px);outline:none;box-shadow:0 0 0 3px color-mix(in srgb,var(--_comark-ring) 50%,transparent)}",
  ".cch-data table{margin-top:.5rem;border-collapse:collapse;color:var(--_comark-foreground);font-variant-numeric:tabular-nums}",
  ".cch-data :is(th,td){padding:.25rem .75rem;border-bottom:1px solid var(--_comark-border);text-align:start}",
  ".cch-data th{font-weight:500}",
  "@media print{.cch{break-inside:avoid}.cch-bar{display:none}}",
].join("")}}`;
