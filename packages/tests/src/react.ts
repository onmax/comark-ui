import { createElement, type ReactNode, useEffect } from "react";
import { addStyles, summary } from "./client.ts";
import type { TestsAttributes } from "./index.ts";

export { default } from "./index.ts";
export type { TestsAttributes, TestsMeta, TestsOptions, TestsReader } from "./index.ts";

/** `::tests` for `@comark/react`. */
export function Tests({
  passed,
  failed,
  skipped,
  duration,
  title,
  children,
}: TestsAttributes & { children?: ReactNode }) {
  useEffect(addStyles, []);
  return createElement(
    "section",
    {
      className: "ctr",
      "data-status": failed ? "failed" : "passed",
      "aria-label": title || "Test results",
    },
    createElement(
      "p",
      { className: "ctr-summary" },
      title ? createElement("strong", { className: "ctr-title" }, title) : null,
      ...summary({ passed, failed, skipped }).map(({ kind, text }) =>
        createElement("span", { className: "ctr-count", "data-kind": kind, key: kind }, text),
      ),
      duration ? createElement("span", { className: "ctr-time" }, duration) : null,
    ),
    children,
  );
}

/** Pass these as `components` to `@comark/react`. */
export const components = { Tests };
