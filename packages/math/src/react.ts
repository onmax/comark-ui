import { createElement, useEffect } from "react";
import { addStyles, classOf } from "./client.ts";
import type { FormulaAttributes } from "./index.ts";

export { default } from "./index.ts";
export type { FormulaAttributes, MathMeta, MathOptions, MathOutput } from "./index.ts";

/** Math for `@comark/react`. */
export function Formula({ tex, display, html }: FormulaAttributes) {
  useEffect(addStyles, []);
  return html
    ? // The plugin typeset `html` itself, with links and other trusted commands off.
      createElement("span", {
        className: classOf(display, true),
        dangerouslySetInnerHTML: { __html: html },
      })
    : createElement("span", { className: classOf(display, false) }, tex ?? "");
}

/** Pass these as `components` to `@comark/react`. */
export const components = { Formula };
