import { createElement, type ReactNode, useEffect } from "react";
import { addStyles } from "./client.ts";

export { colors, default } from "./index.ts";
export type { BadgeAttributes, BadgeColor, BadgeMeta, BadgeOptions } from "./index.ts";

/** `:badge` for `@comark/react`. */
export function Badge({
  color = "primary",
  src,
  label,
  children,
}: {
  color?: string;
  src?: string;
  label?: string;
  children?: ReactNode;
}) {
  useEffect(addStyles, []);
  if (src)
    return createElement("img", { className: "cb-image", src, alt: label ?? "Badge", height: 26 });
  return createElement("span", { className: "cb", "data-color": color }, children);
}

/** Pass these as `components` to `@comark/react`. */
export const components = { Badge };
