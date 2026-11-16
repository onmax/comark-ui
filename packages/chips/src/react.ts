import { createElement, type ReactNode, useEffect } from "react";
import { addStyles } from "./client.ts";

export { CHIP_TAG, chipNode, default } from "./index.ts";
export type { ChipsMeta, ChipsOptions } from "./index.ts";

/** A chip for `@comark/react`. */
export function Chip(props: {
  href?: string;
  kind?: string;
  src?: string;
  title?: string;
  children?: ReactNode;
}) {
  useEffect(addStyles, []);
  return createElement(
    "a",
    { className: "cp", href: props.href, "data-kind": props.kind, title: props.title },
    props.src ? createElement("img", { className: "cp-img", src: props.src, alt: "" }) : null,
    props.children,
  );
}

/** Pass these as `components` to `@comark/react`. */
export const components = { Chip };
