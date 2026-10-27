import type { Component, Snippet } from "svelte";
import type { RailAttributes, TocAttributes } from "comark-outline";

export { default, RAIL_TAG } from "comark-outline";
export type {
  OutlineMeta,
  OutlineOptions,
  RailAttributes,
  RailOptions,
  TocAttributes,
} from "comark-outline";

export declare const Toc: Component<TocAttributes & { children?: Snippet }>;
export declare const TocRail: Component<RailAttributes & { children?: Snippet }>;
export declare const components: { Toc: typeof Toc; TocRail: typeof TocRail };
