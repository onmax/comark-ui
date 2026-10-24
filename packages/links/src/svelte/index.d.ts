import type { Component, Snippet } from "svelte";
import type { Anchor } from "comark-links";

export { anchors, external, STYLES_TAG } from "comark-links";
export type { Anchor, AnchorsOptions, ExternalOptions } from "comark-links";

type Heading = Component<{
  anchor?: Anchor;
  children?: Snippet;
  [attribute: string]: unknown;
}>;

export declare const H1: Heading;
export declare const H2: Heading;
export declare const H3: Heading;
export declare const H4: Heading;
export declare const H5: Heading;
export declare const H6: Heading;
export declare const LinksStyles: Component;
export declare const components: {
  H1: Heading;
  H2: Heading;
  H3: Heading;
  H4: Heading;
  H5: Heading;
  H6: Heading;
  LinksStyles: typeof LinksStyles;
};
