import { theme } from "comark-zoom/theme";

/** The typeset styles, for a page that renders Markdown without comark-ui, such as a rich-text editor. */
export { typesetCss } from "./typeset-css.ts";

// comark-charts' palette, so a Mermaid pie or xychart colors its series like a chart does.
const series = [
  "#3b82f6",
  "#f97316",
  "#10b981",
  "#a855f7",
  "#f43f5e",
  "#eab308",
  "#06b6d4",
  "#ec4899",
];

/**
 * comark-pele's diagrams on the shared `--comark-*` tokens, on a card like comark-diagrams'. Pele paints with its
 * `--pele-*` variables, so setting them on the wrapper themes every diagram, light and dark, without drawing it
 * again. The rules sit in the `comark` layer, so host `--pele-*` values are preserved and win over these fallbacks.
 */
export const mermaidCss = `@layer comark{${[
  theme(".pele-diagram"),
  theme(":root"),
  `:where(:root){--pele-bg:var(--_comark-background);--pele-fg:var(--_comark-foreground);--pele-muted:var(--_comark-muted);--pele-line:var(--_comark-muted);--pele-surface:var(--_comark-accent);--pele-surface-alt:color-mix(in srgb,var(--_comark-accent),var(--_comark-foreground) 6%);--pele-border:var(--_comark-border);--pele-accent:var(--ui-primary,var(--primary,var(--_comark-foreground)));--pele-critical:var(--ui-error,var(--destructive,#dc2626));--pele-error:var(--ui-error,var(--destructive,#dc2626));--pele-font:var(--_comark-font);--pele-radius:calc(var(--_comark-radius) - 4px);--pele-series-1:var(--comark-chart-1,var(--ui-chart-1,var(--chart-1,#3b82f6)));--pele-series-2:var(--comark-chart-2,var(--ui-chart-2,var(--chart-2,#f97316)));--pele-series-3:var(--comark-chart-3,var(--ui-chart-3,var(--chart-3,#10b981)));--pele-series-4:var(--comark-chart-4,var(--ui-chart-4,var(--chart-4,#a855f7)));--pele-series-5:var(--comark-chart-5,var(--ui-chart-5,var(--chart-5,#f43f5e)));--pele-series-6:var(--comark-chart-6,var(--ui-chart-6,var(--chart-6,#eab308)));--pele-series-7:var(--comark-chart-7,var(--ui-chart-7,var(--chart-7,#06b6d4)));--pele-series-8:var(--comark-chart-8,var(--ui-chart-8,var(--chart-8,#ec4899)))}`,
  ".pele-diagram{--comark-wide-width:calc(var(--cmm-svg) + 2rem + 2px);box-sizing:border-box;margin-block:1.5rem;padding:1rem;overflow-x:auto;border:1px solid var(--_comark-border);border-radius:var(--_comark-radius);background:var(--_comark-background);color:var(--_comark-foreground);text-align:center}",
  // A diagram too wide for its card scrolls rather than shrink past 28rem; a smaller one keeps its own size.
  ".pele-diagram>svg{min-width:min(28rem,var(--cmm-svg,28rem))}",
  ".pele-source{margin:0;color:var(--_comark-muted);text-align:left}",
  "@media print{.pele-diagram{break-inside:avoid}}",
].join("")}}`;

/** Sizes Mermaid cards after Pele draws them in Vue, React, and Svelte, and adds the styles to the page once. */
export function addMermaidStyles(): void {
  // Pele calls onRender after inserting the SVG, including on updates. Keep each card's width in sync even when
  // another diagram already installed the stylesheet.
  for (const svg of document.querySelectorAll<SVGSVGElement>(".pele-diagram > svg")) {
    const width = Number(svg.getAttribute("width"));
    const card = svg.parentElement!;
    if (Number.isFinite(width) && width > 0) {
      card.dataset.wide = "";
      card.style.setProperty("--cmm-svg", `${Math.ceil(width)}px`);
    }
  }
  if (document.querySelector("style[data-comark-mermaid]")) return;
  const style = document.createElement("style");
  style.dataset.comarkMermaid = "";
  style.textContent = mermaidCss;
  document.head.append(style);
}
