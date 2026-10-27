import { theme } from "comark-zoom/theme";
import { INK, SERIES } from "./colors.ts";

// Rules of the host's stylesheet beat an SVG's presentation attributes, so each ink is swapped by its color.
const swap = (hex: string, color: string, props = ["fill", "stroke"]) =>
  props.map((prop) => `.cch-plot [${prop}="${hex}"]{${prop}:${color}}`).join("");

/**
 * A chart over its data table, on the shared `--comark-*` tokens. Series take `--comark-chart-1` to `-6`, then
 * Nuxt UI's `--ui-chart-1` to `-6`, then shadcn/ui's `--chart-1` to `-6`. The rules sit in the `comark` layer, so any unlayered rule of the host's wins.
 */
export const css = `@layer comark{${[
  theme(".cch"),
  // The Data footer runs to the card's edges, so it spans the same side padding the card has.
  ":where(.cch){--cch-padding:1.5rem}",
  // A card, as shadcn/ui frames its charts: the title on top, the chart, and the data as its footer.
  ".cch{margin:1.5rem 0;padding:1.25rem var(--cch-padding) 0;border:1px solid var(--_comark-border);border-radius:var(--_comark-radius);background:var(--_comark-background);color:var(--_comark-foreground);font-family:var(--_comark-font)}",
  // Only the card's own caption: a marked chart's notes sit in comark-annotate's figcaption inside it.
  ".cch>figcaption{margin-bottom:1rem;font-weight:600;font-size:1rem;line-height:1.5rem}",
  // Every chart keeps the size its text was set for, and a narrower column shrinks it to fit, as it does a screenshot,
  // since marks sit at percentages of the SVG. Only the chart's own SVG: a mark's circle and arrow are SVGs too, and
  // `height:auto` would stretch them to their viewBox. A chart narrower than its card sits in the middle.
  ":is(.cch-plot,.cch-marked .ca-frame)>svg{display:block;max-width:100%;height:auto;margin-inline:auto}",
  ".cch-plot text{font-family:var(--_comark-font)}",
  ".cch-marked .ca-frame{width:fit-content;max-width:100%;margin-inline:auto}",
  // draw.ts already pads a mark's area out from its shape in the chart's own pixels, so a box takes no more room,
  // which would push one at the plot's edge past the chart.
  ".cch-marked .ca{--ca-pad:0}",
  // A narrow column outlines a mark that draws nothing, which on a screenshot shows its area; on a chart it marks a
  // point, so it would be a broken ring under the letter, which marks the point alone.
  ".cch-marked .ca .ca-mark.ca-none{outline:none}",
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
  ".cch-data{margin:1rem calc(-1 * var(--cch-padding)) 0;padding:.75rem var(--cch-padding);border-top:1px solid var(--_comark-border);color:var(--_comark-muted);font-size:.875rem;line-height:1.25rem}",
  ".cch-data summary{width:fit-content;cursor:pointer}",
  ".cch>table{margin-bottom:1.25rem}",
  ".cch-data summary:focus-visible{border-radius:calc(var(--_comark-radius) - 4px);outline:none;box-shadow:0 0 0 3px color-mix(in srgb,var(--_comark-ring) 50%,transparent)}",
  ".cch-data table{margin-top:.5rem;border-collapse:collapse;color:var(--_comark-foreground);font-variant-numeric:tabular-nums}",
  ".cch-data :is(th,td){padding:.25rem .75rem;border-bottom:1px solid var(--_comark-border);text-align:start}",
  ".cch-data th{font-weight:500}",
  "@media print{.cch{break-inside:avoid}}",
].join("")}}`;
