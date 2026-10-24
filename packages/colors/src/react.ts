import { type CSSProperties, createElement, type ReactNode, useEffect } from "react";
import { addStyles } from "./client.ts";
import type { ColorAttributes } from "./index.ts";

export { default, isColor } from "./index.ts";
export type { ColorAttributes, ColorsMeta } from "./index.ts";

/** A color in inline code, or a line of a `::palette`, for `@comark/react`. */
export function Color({ value, name }: ColorAttributes) {
  useEffect(addStyles, []);
  if (!value) return null;
  // SAFETY: React writes a custom property from a style object as it is.
  const style = { "--cco": value } as CSSProperties;
  if (name)
    return createElement(
      "li",
      null,
      createElement("span", { className: "cco-tile", style }),
      createElement("span", { className: "cco-name" }, name),
      createElement("span", { className: "cco-value" }, value),
    );
  return createElement(
    "code",
    { className: "cco" },
    createElement("span", { className: "cco-swatch", style, "aria-hidden": true }),
    value,
  );
}

/** `::palette` for `@comark/react`. */
export function Palette({ children }: { children?: ReactNode }) {
  useEffect(addStyles, []);
  return createElement("ul", { className: "cco-palette" }, children);
}

/** Pass these as `components` to `@comark/react`. */
export const components = { Color, Palette };
