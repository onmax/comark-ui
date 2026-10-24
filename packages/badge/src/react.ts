import { createElement, type ReactNode, useEffect } from "react";
import { addStyles } from "./client.ts";

export { colors, default } from "./index.ts";
export type { BadgeAttributes, BadgeColor, BadgeMeta } from "./index.ts";

/** `:badge` for `@comark/react`. */
export function Badge({ color = "primary", children }: { color?: string; children?: ReactNode }) {
  useEffect(addStyles, []);
  return createElement("span", { className: "cb", "data-color": color }, children);
}

/** Pass these as `components` to `@comark/react`. */
export const components = { Badge };
