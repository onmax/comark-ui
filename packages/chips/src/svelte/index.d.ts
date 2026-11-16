import type { Component, Snippet } from "svelte";

export { CHIP_TAG, chipNode, default } from "comark-chips";
export type { ChipsMeta, ChipsOptions } from "comark-chips";

export declare const Chip: Component<{
  href?: string;
  kind?: string;
  src?: string;
  title?: string;
  children?: Snippet;
}>;
export declare const components: { Chip: typeof Chip };
