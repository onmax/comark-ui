import { Children, createElement, type ReactNode, useEffect } from "react";
import { addStyles } from "./client.ts";

export { default } from "./index.ts";
export type { PropertiesMeta, PropertiesOptions } from "./index.ts";

/** The properties box for `@comark/react`. */
export function Properties({ children }: { children?: ReactNode }) {
  useEffect(addStyles, []);
  return Children.count(children) ? createElement("dl", { className: "cfm" }, children) : null;
}

/** Pass these as `components` to `@comark/react`. */
export const components = { Properties };
