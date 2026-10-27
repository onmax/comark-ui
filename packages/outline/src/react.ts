import { Children, createElement, type ReactNode, useEffect } from "react";
import { addStyles, start } from "./client.ts";
import type { RailAttributes, TocAttributes } from "./index.ts";

export { default, RAIL_TAG } from "./index.ts";
export type {
  OutlineMeta,
  OutlineOptions,
  RailAttributes,
  RailOptions,
  TocAttributes,
} from "./index.ts";

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

/** The side outline for `@comark/react`. It starts the script that places it when it mounts. */
export function TocRail({ title, children }: RailAttributes & { children?: ReactNode }) {
  useEffect(() => {
    addStyles();
    return start();
  }, []);
  return createElement(
    "nav",
    { className: "cto cto-rail", "aria-label": title },
    createElement("p", { className: "cto-title" }, title),
    children,
  );
}

/** Pass these as `components` to `@comark/react`. */
export const components = { Toc, TocRail };
