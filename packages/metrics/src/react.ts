import { createElement, type ReactNode, useEffect } from "react";
import { addStyles } from "./client.ts";
import type { DeltaAttributes, ProgressAttributes } from "./index.ts";

export { default, PROGRESS_TAG, STATS_TILES_TAG } from "./index.ts";
export type { DeltaAttributes, MetricsMeta, ProgressAttributes } from "./index.ts";

/** `:delta`, and each change in a `::stats` table, for `@comark/react`. */
export function Delta({ from, to, change, direction, verdict }: DeltaAttributes) {
  useEffect(addStyles, []);
  if (!change) return null;
  return createElement(
    "span",
    { className: "cmt-delta", "data-direction": direction, "data-verdict": verdict },
    ...(from && to
      ? [
          createElement("span", { className: "cmt-from", key: "from" }, from),
          " → ",
          createElement("span", { className: "cmt-to", key: "to" }, to),
          " ",
        ]
      : []),
    createElement("span", { className: "cmt-change", key: "change" }, change),
  );
}

/** `:progress` for `@comark/react`. */
export function ProgressBar({ value, max, percent, label }: ProgressAttributes) {
  useEffect(addStyles, []);
  if (!percent) return null;
  return createElement(
    "span",
    { className: "cmt-progress" },
    label ? createElement("span", { className: "cmt-label" }, label) : null,
    createElement("progress", { value, max, "aria-label": label || undefined }, percent),
    createElement("span", { className: "cmt-percent" }, percent),
  );
}

/** `::stats{tiles}` for `@comark/react`. */
export function StatTiles({ children }: { children?: ReactNode }) {
  useEffect(addStyles, []);
  return createElement("dl", { className: "cmt-tiles" }, children);
}

/** Pass these as `components` to `@comark/react`. */
export const components = { Delta, ProgressBar, StatTiles };
