import { Children, createElement, type ReactNode, useEffect } from "react";
import { addStyles } from "./client.ts";
import type { TocAttributes } from "./index.ts";

export { default } from "./index.ts";
export type { TocAttributes, OutlineMeta } from "./index.ts";

/** `::toc` for `@comark/react`. */
export function Toc({ title, children }: TocAttributes & { children?: ReactNode }) {
  useEffect(addStyles, []);
  if (!Children.count(children)) return null;
  return createElement(
    "nav",
    { className: "cto", "aria-label": title || "Contents" },
    title ? createElement("p", { className: "cto-title" }, title) : null,
    children,
  );
}

/** Pass these as `components` to `@comark/react`. */
export const components = { Toc };
