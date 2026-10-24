import { createElement, type ReactNode, useEffect } from "react";
import type { Anchor } from "./anchors.ts";
import { addStyles } from "./client.ts";
import { text } from "./text.ts";

export { anchors, external, STYLES_TAG } from "./index.ts";
export type { Anchor, AnchorsOptions, ExternalOptions } from "./index.ts";

type HeadingProps = {
  anchor?: Anchor;
  children?: ReactNode;
  [attribute: string]: unknown;
};

const heading = (tag: string) => {
  function Heading({ anchor, children, ...attrs }: HeadingProps) {
    useEffect(() => {
      if (anchor) addStyles();
    }, [anchor]);
    // Everything but `anchor` belongs to the heading itself.
    const element = createElement(tag, attrs, children);
    const id = text(attrs.id);
    if (!anchor || !id) return element;
    return createElement(
      "div",
      { className: "cl-heading" },
      element,
      createElement(
        "a",
        { className: "cl-anchor", href: `#${id}` },
        createElement("span", { "aria-hidden": "true" }, anchor.icon),
        createElement("span", { className: "cl-sr" }, anchor.label),
      ),
    );
  }
  Heading.displayName = tag.toUpperCase();
  return Heading;
};

/** Adds the styles for the new-tab warning, and renders nothing. */
export function LinksStyles() {
  useEffect(addStyles, []);
  return null;
}

export const H1 = heading("h1");
export const H2 = heading("h2");
export const H3 = heading("h3");
export const H4 = heading("h4");
export const H5 = heading("h5");
export const H6 = heading("h6");

/** Pass these as `components` to `@comark/react`. */
export const components = { H1, H2, H3, H4, H5, H6, LinksStyles };
