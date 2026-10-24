import { createElement, useEffect } from "react";
import { addStyles, viewBox } from "./client.ts";
import type { QrAttributes } from "./index.ts";

export { default } from "./index.ts";
export type { QrAttributes, QrMeta } from "./index.ts";

/** `:qr` for `@comark/react`. */
export function Qr({ value, size, path }: QrAttributes) {
  useEffect(addStyles, []);
  if (!path) return null;
  return createElement(
    "span",
    { className: "cqr", role: "img", "aria-label": `QR code: ${value ?? ""}` },
    createElement(
      "svg",
      { viewBox: viewBox(Number(size)), width: 128, height: 128, "aria-hidden": true },
      createElement("path", { d: path, fill: "currentColor" }),
    ),
  );
}

/** Pass these as `components` to `@comark/react`. */
export const components = { Qr };
