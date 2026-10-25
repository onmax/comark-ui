import { createElement, type ReactNode, useEffect } from "react";
import { addStyles } from "./client.ts";

export { default } from "./index.ts";

type Props = { className?: string; children?: ReactNode; [attribute: string]: unknown };

// The tag renders as it would without the components, with the class beside any the Markdown gave it.
const classed = (tag: string, name: string) => {
  function Classed({ className, children, ...attrs }: Props) {
    useEffect(addStyles, []);
    return createElement(
      tag,
      { ...attrs, className: className ? `${name} ${className}` : name },
      children,
    );
  }
  Classed.displayName = tag.charAt(0).toUpperCase() + tag.slice(1);
  return Classed;
};

export const Mark = classed("mark", "cmk-mark");
export const Sup = classed("sup", "cmk-sup");

/** Pass these as `components` to `@comark/react`. */
export const components = { Mark, Sup };
