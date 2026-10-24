import { createElement, type ReactNode, useEffect } from "react";
import { css, parts, start } from "./client.ts";

export { default } from "./index.ts";

type PreProps = {
  children?: ReactNode;
  [attribute: string]: unknown;
};

/** Code blocks for `@comark/react`. */
export function Pre({ children, ...attrs }: PreProps) {
  useEffect(() => {
    return start(css);
  }, []);
  const {
    wrapper: { class: className, ...wrapper },
    pre,
    bar,
  } = parts(attrs);
  return createElement(
    "div",
    { className, ...wrapper },
    // Everything the parse plugin didn't write for the wrapper belongs to the `pre` itself, such as Shiki's class and
    // the block's language.
    createElement("pre", pre, children),
    // The bar is static markup built from escaped text, the same string every renderer uses.
    createElement("div", { className: "ck-bar", dangerouslySetInnerHTML: { __html: bar } }),
  );
}

/** Pass these as `components` to `@comark/react`. */
export const components = { Pre };
