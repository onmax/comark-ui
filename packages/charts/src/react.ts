import { createElement, type ReactNode, useEffect } from "react";
import { bar, css, start } from "./client.ts";

export { default } from "./index.ts";
export type { ChartsMeta, ChartsOptions, DrawnChart } from "./index.ts";

/** A chart for `@comark/react`. Its marks are drawn only by `@comark/html`. */
export function Chart(props: {
  type?: string;
  title?: string;
  svg?: string;
  children?: ReactNode;
}) {
  useEffect(() => start(css), []);
  if (!props.svg) return createElement("div", null, props.children);
  return createElement(
    "figure",
    { className: "cch", "data-type": props.type },
    props.title ? createElement("figcaption", null, props.title) : null,
    createElement("div", { className: "cch-plot", dangerouslySetInnerHTML: { __html: props.svg } }),
    createElement("div", { className: "cch-bar", dangerouslySetInnerHTML: { __html: bar() } }),
    createElement(
      "details",
      { className: "cch-data" },
      createElement("summary", null, "Data"),
      props.children,
    ),
  );
}

/** Pass these as `components` to `@comark/react`. */
export const components = { Chart };
