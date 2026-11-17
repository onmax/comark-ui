import { Children, createElement, type ReactNode, useEffect, useRef } from "react";
import { start } from "./client.ts";

export { default } from "./index.ts";
export type { PropertiesMeta, PropertiesOptions } from "./index.ts";

/** The properties box for `@comark/react`. */
export function Properties({ children }: { children?: ReactNode }) {
  const box = useRef<HTMLElement>(null);
  // Rebind after each commit, including when an empty box gains or loses its node.
  useEffect(() => (box.current ? start(box.current) : undefined));
  return Children.count(children)
    ? createElement("dl", { className: "cfm", "data-comark-frame": "", ref: box }, children)
    : null;
}

/** Pass these as `components` to `@comark/react`. */
export const components = { Properties };
