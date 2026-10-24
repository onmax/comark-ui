import { createElement, type ReactNode, useEffect } from "react";
import { bar, css, start } from "./client.ts";
import type { TableAttributes } from "./index.ts";

export { default, TABLE_TAG } from "./index.ts";
export type { TableAttributes, TableMeta, TableOptions, TableReader } from "./index.ts";

/** Tables for `@comark/react`. */
export function DataTable({ copy, children }: TableAttributes & { children?: ReactNode }) {
  useEffect(() => start(css), []);
  return createElement(
    "div",
    { className: "ctb" },
    copy
      ? createElement("div", { className: "ctb-bar", dangerouslySetInnerHTML: { __html: bar() } })
      : null,
    createElement("div", { className: "ctb-scroll" }, children),
  );
}

/** Pass these as `components` to `@comark/react`. */
export const components = { DataTable };
