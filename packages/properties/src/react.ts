import { Children, createElement, type ReactNode, useEffect, useRef } from "react";
import { relativize, start } from "./client.ts";

export { default } from "./index.ts";
export type { PropertiesMeta, PropertiesOptions } from "./index.ts";

/** The properties box for `@comark/react`. */
export function Properties({ children }: { children?: ReactNode }) {
  const box = useRef<HTMLElement>(null);
  useEffect(() => (box.current ? start(box.current) : undefined), []);
  // A render can write a date's server text again; the clock that `start` set keeps it current after this.
  useEffect(() => {
    if (box.current) relativize(box.current)();
  });
  return Children.count(children)
    ? createElement("dl", { className: "cfm", "data-comark-frame": "", ref: box }, children)
    : null;
}

/** Pass these as `components` to `@comark/react`. */
export const components = { Properties };
