import { Children, createElement, type ReactNode, useEffect } from "react";
import { css, start } from "./client.ts";
import type { SourcesAttributes } from "./index.ts";

export { default } from "./index.ts";
export type { SourcesAttributes, SourcesMeta } from "./index.ts";

/** `::sources` for `@comark/react`. */
export function Sources({ title, children }: SourcesAttributes & { children?: ReactNode }) {
  useEffect(() => start(css), []);
  if (!Children.count(children)) return null;
  const label = title || "Sources";
  return createElement(
    "section",
    { className: "cso", "aria-label": label },
    createElement("p", { className: "cso-title" }, label),
    children,
  );
}

/** Pass these as `components` to `@comark/react`. */
export const components = { Sources };
