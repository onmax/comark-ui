import type { Component, Snippet } from "svelte";
import type { TocAttributes } from "comark-outline";

export { default } from "comark-outline";
export type { TocAttributes, OutlineMeta } from "comark-outline";

export declare const Toc: Component<TocAttributes & { children?: Snippet }>;
export declare const components: { Toc: typeof Toc };
