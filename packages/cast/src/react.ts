import { createElement, type ReactNode, useEffect } from "react";
import { addStyles } from "./client.ts";
import type { CastAttributes } from "./index.ts";

export { default } from "./index.ts";
export type { CastAttributes, CastMeta, CastOptions, CastReader } from "./index.ts";

/** `::cast` for `@comark/react`. */
export function Cast({ mode, title, children }: CastAttributes & { children?: ReactNode }) {
  useEffect(addStyles, []);
  if (!mode) return null;
  return createElement(
    "figure",
    { className: "cca", "data-mode": mode },
    title ? createElement("figcaption", null, title) : null,
    createElement("pre", { className: "cca-term" }, children),
  );
}

/** Pass these as `components` to `@comark/react`. */
export const components = { Cast };
