import type { Component, Snippet } from "svelte";

export { default } from "comark-mark";

type Classed = Component<{ class?: string; children?: Snippet; [attribute: string]: unknown }>;

export declare const Mark: Classed;
export declare const Sup: Classed;
export declare const components: { Mark: Classed; Sup: Classed };
