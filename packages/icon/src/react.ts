import { type CSSProperties, createElement, useEffect } from "react";
import { addStyles, iconStyle } from "./client.ts";

export {
  createIcons,
  default,
  describeIconProblem,
  ICON_TAG,
  iconProblemRule,
  parseIconName,
} from "./index.ts";
export type {
  IconCollection,
  IconData,
  IconMeta,
  IconOptions,
  IconProblem,
  IconRule,
  Icons,
} from "./index.ts";

/** `:icon` for `@comark/react`, and an icon for other plugins' components to draw. */
export function Icon(props: {
  src?: string;
  ratio?: string | number;
  mask?: string | boolean;
  label?: string;
}) {
  useEffect(addStyles, []);
  if (!props.src) return null;
  return createElement("span", {
    className: "ci",
    "data-mask": props.mask ? "" : undefined,
    ...(props.label ? { role: "img", "aria-label": props.label } : { "aria-hidden": "true" }),
    // SAFETY: React sets custom properties like any other; its style type lists only standard ones.
    style: iconStyle(props.src, props.ratio) as CSSProperties,
  });
}

/** Pass these as `components` to `@comark/react`. */
export const components = { Icon };
