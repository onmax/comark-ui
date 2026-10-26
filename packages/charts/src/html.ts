import type { NodeHandler } from "comark";
import { annotateHtml } from "comark-annotate/html";
import { escapeHtml } from "comark/utils";
import type { DrawnChart } from "./index.ts";
import { css } from "./styles.ts";

export { default } from "./index.ts";
export type {
  Chart,
  ChartsMeta,
  ChartsOptions,
  ChartType,
  DrawnChart,
  FlowChart,
  SpecChart,
  XKind,
} from "./index.ts";
export { css };

// Each render gets a fresh `state.context`, so a document carries the styles once.
const styled = new WeakSet<object>();

const chart: NodeHandler = async (node, state) => {
  const [, attrs, ...children] = node;
  // SAFETY: the parse plugin writes a DrawnChart on every chart it drew, and leaves no `svg` on the others.
  const { type, title, label, svg, marks } = attrs as Partial<DrawnChart>;
  if (!svg) return state.flow(["div", {}, ...children], state);
  const styles = styled.has(state.context) ? "" : `<style data-comark-charts>${css}</style>`;
  styled.add(state.context);
  const data = (await Promise.all(children.map((child) => state.one(child, state)))).join("");
  const caption = title ? `<figcaption>${escapeHtml(title)}</figcaption>` : "";
  const [, width, height] = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg) ?? [];
  const aspect = width && height ? Number(height) / Number(width) : undefined;
  const plot = marks?.length
    ? `<div class="cch-plot cch-marked">${await annotateHtml(svg, marks, label ?? "", state, ".cch-plot", aspect)}</div>`
    : `<div class="cch-plot">${svg}</div>`;
  return (
    `${styles}<figure class="cch" data-type="${type}">${caption}${plot}` +
    `<details class="cch-data"><summary>Data</summary>${data}</details></figure>`
  );
};

/** The HTML renderer for `::chart`. Pass it as `components`; it inlines the styles once per document. */
export const components: Record<"chart", NodeHandler> = { chart };
