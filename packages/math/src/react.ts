import { Children, createElement, type ReactNode, useEffect } from "react";
import { addStyles, classOf } from "./client.ts";
import type { FormulaAttributes } from "./index.ts";

export { default, KATEX_TAGS, MATHML_TAGS } from "./index.ts";
export type { FormulaAttributes, MathMeta, MathOptions, MathOutput } from "./index.ts";

/** Math for `@comark/react`. The typeset MathML arrives as its children. */
export function Formula({ tex, display, children }: FormulaAttributes & { children?: ReactNode }) {
  useEffect(addStyles, []);
  return Children.count(children)
    ? createElement("span", { className: classOf(display, true) }, children)
    : createElement("span", { className: classOf(display, false) }, tex ?? "");
}

/** Pass these as `components` to `@comark/react`. */
export const components = { Formula };
