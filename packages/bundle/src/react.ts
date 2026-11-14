import { createElement, type ReactNode, useEffect } from "react";
import { addStyles } from "./client.ts";
import type { BundleAttributes } from "./index.ts";

export { default } from "./index.ts";
export type {
  BundleAttributes,
  BundleLister,
  BundleMeta,
  BundleOptions,
  BundleReader,
} from "./index.ts";

/** `::bundle` for `@comark/react`. */
export function Bundle({ label, children }: BundleAttributes & { children?: ReactNode }) {
  useEffect(addStyles, []);
  return createElement(
    "figure",
    {
      className: "cbr",
      "data-comark-frame": "",
      "data-not-typeset": "",
      "aria-label": label || undefined,
    },
    children,
  );
}

/** Pass these as `components` to `@comark/react`. */
export const components = { Bundle };
