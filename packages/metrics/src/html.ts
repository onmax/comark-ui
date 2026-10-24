import type { NodeHandler, State } from "comark";
import { escapeHtml } from "comark/utils";
import { css } from "./styles.ts";

export { default, PROGRESS_TAG, STATS_TILES_TAG } from "./index.ts";
export type { DeltaAttributes, MetricsMeta, ProgressAttributes } from "./index.ts";

// Each render gets a fresh `state.context`, so a document carries the styles once.
const styled = new WeakSet<object>();

const text = (value: unknown) =>
  value === undefined || value === null || value instanceof Object
    ? ""
    : // SAFETY: undefined, null, objects, and arrays returned above, so only a string, number, or boolean is left.
      String(value as string | number | boolean);
const attr = (value: unknown) => escapeHtml(text(value), { '"': "&quot;" });
const styles = ({ context }: State) => {
  if (styled.has(context)) return "";
  styled.add(context);
  return `<style data-comark-metrics>${css}</style>`;
};

const delta: NodeHandler = ([, attrs], state) => {
  const { from, to, change, direction, verdict } = attrs;
  if (!change) return "";
  return (
    `${styles(state)}<span class="cmt-delta" data-direction="${attr(direction)}" data-verdict="${attr(verdict)}">` +
    (from && to
      ? `<span class="cmt-from">${attr(from)}</span> → <span class="cmt-to">${attr(to)}</span> `
      : "") +
    `<span class="cmt-change">${attr(change)}</span></span>`
  );
};

const progress: NodeHandler = ([, attrs], state) => {
  const { value, max, percent, label } = attrs;
  if (!percent) return "";
  return (
    `${styles(state)}<span class="cmt-progress">` +
    (label ? `<span class="cmt-label">${attr(label)}</span>` : "") +
    `<progress value="${attr(value)}" max="${attr(max)}"${label ? ` aria-label="${attr(label)}"` : ""}>${attr(percent)}</progress>` +
    `<span class="cmt-percent">${attr(percent)}</span></span>`
  );
};

const tiles: NodeHandler = async (node, state) =>
  `${styles(state)}<dl class="cmt-tiles">${await state.flow(node, state)}</dl>`;

/** The HTML renderer for `:delta`, `:progress`, and `::stats`. Pass it as `components`; it inlines the styles once per document. */
export const components: Record<"delta" | "progress-bar" | "stat-tiles", NodeHandler> = {
  delta,
  "progress-bar": progress,
  "stat-tiles": tiles,
};
