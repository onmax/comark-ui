import { Children, createElement, type ReactNode, useEffect, useRef } from "react";
import { addStyles, localizeDates } from "./client.ts";

export { default } from "./index.ts";
export type { PropertiesMeta, PropertiesOptions } from "./index.ts";

/** The properties box for `@comark/react`. */
export function Properties({ children }: { children?: ReactNode }) {
  const box = useRef<HTMLElement>(null);
  useEffect(addStyles, []);
  // Every render writes the dates in English again, so each one localizes them after.
  useEffect(() => {
    if (box.current) localizeDates(box.current);
  });
  return Children.count(children)
    ? createElement("dl", { className: "cfm", ref: box }, children)
    : null;
}

/** Pass these as `components` to `@comark/react`. */
export const components = { Properties };
