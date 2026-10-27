import { theme } from "comark-zoom/theme";
import { start } from "./script.ts";

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
  theme(".cmm,.pele-diagram"),
  theme(":root"),
  `:where(:root){--pele-bg:var(--_comark-background);--pele-fg:var(--_comark-foreground);--pele-muted:var(--_comark-muted);--pele-line:var(--_comark-muted);--pele-surface:var(--_comark-accent);--pele-surface-alt:color-mix(in srgb,var(--_comark-accent),var(--_comark-foreground) 6%);--pele-border:var(--_comark-border);--pele-accent:var(--ui-primary,var(--primary,var(--_comark-foreground)));--pele-critical:var(--ui-error,var(--destructive,#dc2626));--pele-error:var(--ui-error,var(--destructive,#dc2626));--pele-font:var(--_comark-font);--pele-radius:calc(var(--_comark-radius) - 4px);--pele-series-1:var(--comark-chart-1,var(--ui-chart-1,var(--chart-1,#3b82f6)));--pele-series-2:var(--comark-chart-2,var(--ui-chart-2,var(--chart-2,#f97316)));--pele-series-3:var(--comark-chart-3,var(--ui-chart-3,var(--chart-3,#10b981)));--pele-series-4:var(--comark-chart-4,var(--ui-chart-4,var(--chart-4,#a855f7)));--pele-series-5:var(--comark-chart-5,var(--ui-chart-5,var(--chart-5,#f43f5e)));--pele-series-6:var(--comark-chart-6,var(--ui-chart-6,var(--chart-6,#eab308)));--pele-series-7:var(--comark-chart-7,var(--ui-chart-7,var(--chart-7,#06b6d4)));--pele-series-8:var(--comark-chart-8,var(--ui-chart-8,var(--chart-8,#ec4899)))}`,
  ".pele-diagram{box-sizing:border-box;margin-block:1.5rem;padding:1rem;overflow-x:auto;border:1px solid var(--_comark-border);border-radius:var(--_comark-radius);background:var(--_comark-background);color:var(--_comark-foreground);text-align:center}",
  // A diagram too wide for its card scrolls rather than shrink past 28rem; a smaller one keeps its own size.
  ".pele-diagram>svg{min-width:min(28rem,var(--cmm-svg,28rem))}",
  ".pele-source{margin:0;color:var(--_comark-muted);text-align:left}",
  // The wrapper holds the card and its buttons, and is the wide block, so the buttons stay put while a diagram scrolls.
  // Pele's own zoom buttons, which Vue, React, and Svelte show on a diagram that had to shrink, move to the bottom.
  ".cmm{--comark-wide-width:calc(var(--cmm-svg) + 2rem + 2px);--pele-zoom-top:auto;--pele-zoom-bottom:.5rem;position:relative;margin-block:1.5rem}",
  ".cmm>.pele-diagram{margin-block:0}",
  // The bar sits over the card's top corner and shows on hover or focus, like a chart's, so a diagram keeps its height.
  // A screen with no hover always shows it, and nothing works before the script starts.
  ".cmm-bar{position:absolute;top:.375rem;right:.375rem;z-index:1;display:flex;align-items:center;gap:.125rem;padding:.125rem;border-radius:calc(var(--_comark-radius) - 2px);background:var(--_comark-background);opacity:0;transition:opacity .15s}",
  "html:not([data-mermaid-ready]) .cmm-bar{display:none}",
  ".cmm:is(:hover,:focus-within)>.cmm-bar,.cmm-bar:has(.cmm-status:not(:empty),.cmm-open:not([hidden])){opacity:1}",
  "@media (hover:none){.cmm-bar{opacity:1}}",
  ".cmm:has(>.pele-diagram[data-error]) .cmm-image{display:none}",
  ".cmm-bar>button{display:inline-flex;align-items:center;justify-content:center;width:1.5rem;height:1.5rem;margin:0;padding:0;border:1px solid transparent;border-radius:calc(var(--_comark-radius) - 2px);background:transparent;color:var(--_comark-muted);position:relative;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;transition:background-color .15s ease,color .15s ease}",
  "@media (hover:hover){.cmm-bar>button:hover{background:var(--_comark-accent);color:var(--_comark-foreground)}}",
  "@media (prefers-reduced-motion:no-preference){.cmm-bar>button{transition:background-color .15s ease,color .15s ease,scale .15s ease-out}.cmm-bar>button:active{scale:.96}}",
  ".cmm-bar>button:focus-visible{outline:none;box-shadow:0 0 0 3px color-mix(in srgb,var(--_comark-ring) 50%,transparent)}",
  ".cmm-bar svg{width:.75rem;height:.75rem;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}",
  ".cmm-done,.cmm-bar>[data-state=done] .cmm-idle{display:none}",
  ".cmm-bar>[data-state=done] .cmm-done{display:block}",
  ".cmm-open{padding:0 .375rem;color:var(--_comark-foreground);font:500 .75rem/1.5rem var(--_comark-font);text-decoration:underline;text-underline-offset:2px}",
  ".cmm-open[hidden]{display:none}",
  ".cmm-status{position:absolute;top:calc(100% + .25rem);right:0;width:max-content;max-width:18rem;padding:.25rem .5rem;border-radius:calc(var(--_comark-radius) - 4px);background:var(--_comark-foreground);color:var(--_comark-background);font:.75rem/1.25rem var(--_comark-font);text-align:left;pointer-events:none}",
  ".cmm-status:empty{display:none}",
  ".cmm-markdown{margin:.5rem 0 0;padding:.75rem 1rem;overflow-x:auto;border:1px solid var(--_comark-border);border-radius:var(--_comark-radius);background:var(--_comark-accent);color:var(--_comark-foreground);font:.8125rem/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre}",
  // The zoomed copy fits the dialog, whatever the page's card had to scroll.
  ".cz-item>.pele-diagram>svg{min-width:0}",
  "@media print{.pele-diagram{break-inside:avoid}.cmm-bar{display:none}}",
].join("")}}`;

/** Sizes Mermaid cards after Pele draws them in Vue, React, and Svelte, and adds the styles to the page once. */
export function addMermaidStyles(): void {
  // Pele calls onRender after inserting the SVG, including on updates. Keep each card's width in sync even when
  // another diagram already installed the stylesheet.
  for (const svg of document.querySelectorAll<SVGSVGElement>(".pele-diagram > svg")) {
    const width = Number(svg.getAttribute("width"));
    const card = svg.parentElement!;
    const block = card.parentElement?.classList.contains("cmm") ? card.parentElement : card;
    if (Number.isFinite(width) && width > 0) {
      block.dataset.wide = "";
      block.style.setProperty("--cmm-svg", `${Math.ceil(width)}px`);
    }
  }
  if (document.querySelector("style[data-comark-mermaid]")) return;
  const style = document.createElement("style");
  style.dataset.comarkMermaid = "";
  style.textContent = mermaidCss;
  document.head.append(style);
}

const icon = (name: string, path: string) =>
  `<svg class="cmm-${name}" viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
// Lucide's check (ISC).
const done = icon("done", '<path d="M20 6 9 17l-5-5"/>');

/**
 * The inside of a diagram's bar, the same in every renderer: Copy image, Copy source, the link to the PNG for when the
 * clipboard refuses it, and the status line that says whether the copy worked.
 */
export function mermaidBar(): string {
  return (
    // Lucide's image and code (ISC).
    `<button type="button" class="cmm-image" aria-label="Copy image" title="Copy image">` +
    icon(
      "idle",
      '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
    ) +
    `${done}</button><button type="button" class="cmm-source" aria-label="Copy source" title="Copy source">` +
    icon("idle", '<path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/>') +
    `${done}</button><a class="cmm-open" target="_blank" rel="noopener" hidden>Open PNG</a>` +
    `<span class="cmm-status" role="status"></span>`
  );
}

/**
 * Adds the Mermaid styles and starts the buttons of every diagram on the page, and returns a function that stops them.
 * The Vue, React, and Svelte diagrams call it on mount and stop it on unmount.
 */
export function startMermaid(): () => void {
  addMermaidStyles();
  return start();
}
