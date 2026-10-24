import { createElement, useEffect } from "react";
import { addStyles } from "./client.ts";
import type { DiagramAttributes } from "./index.ts";

export { default, LANGUAGES, sanitizeSvg } from "./index.ts";
export type { DiagramAttributes, DiagramsMeta, DiagramsOptions } from "./index.ts";

/** Diagrams for `@comark/react`. */
export function Diagram({ type, svg, label }: DiagramAttributes) {
  useEffect(addStyles, []);
  if (!svg) return null;
  return createElement(
    "figure",
    { className: "cdg", "data-type": type },
    // The plugin sanitized the SVG when it drew it.
    createElement("div", {
      className: "cdg-svg",
      role: label ? "img" : undefined,
      "aria-label": label || undefined,
      dangerouslySetInnerHTML: { __html: svg },
    }),
    label ? createElement("figcaption", null, label) : null,
  );
}

/** Pass these as `components` to `@comark/react`. */
export const components = { Diagram };
