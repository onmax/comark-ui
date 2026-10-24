import type { Component, Snippet } from "svelte";
import type { IconData } from "comark-icon";

export { default } from "comark-details";
export type {
  DetailsMeta,
  DetailsOptions,
  DisclosureAttributes,
  DisclosureSummaryAttributes,
} from "comark-details";

export declare const Accordion: Component<{ children?: Snippet }>;
export declare const Disclosure: Component<{
  variant?: string;
  name?: string;
  open?: string | boolean;
  children?: Snippet;
}>;
export declare const DisclosureSummary: Component<{
  icon?: IconData;
  show?: string;
  hide?: string;
  children?: Snippet;
}>;
export declare const components: {
  Accordion: typeof Accordion;
  Disclosure: typeof Disclosure;
  DisclosureSummary: typeof DisclosureSummary;
};
