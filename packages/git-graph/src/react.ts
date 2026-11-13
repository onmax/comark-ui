import { createElement, type ReactNode, useEffect } from "react";
import { addStyles } from "./client.ts";
import type { GitGraphAttributes, GitGraphLinesAttributes } from "./index.ts";

export { default } from "./index.ts";
export type { GitGraphAttributes, GitGraphLinesAttributes, GitGraphMeta } from "./index.ts";

/** `::git-graph` for `@comark/react`. */
export function GitGraph({ label, children }: GitGraphAttributes & { children?: ReactNode }) {
  useEffect(addStyles, []);
  return createElement(
    "figure",
    {
      className: "cgg",
      "data-comark-frame": "",
      "data-not-typeset": "",
      "aria-label": label || undefined,
    },
    children,
  );
}

/** The lines and dots of a `::git-graph`, an SVG the parse plugin drew and escaped. */
export function GitGraphLines({ svg }: GitGraphLinesAttributes) {
  return createElement("div", {
    className: "cgg-lines",
    dangerouslySetInnerHTML: { __html: svg ?? "" },
  });
}

/** Pass these as `components` to `@comark/react`. */
export const components = { GitGraph, GitGraphLines };
