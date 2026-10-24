import type { Component, Snippet } from "svelte";

export { default } from "comark-properties";
export type { PropertiesMeta, PropertiesOptions } from "comark-properties";

export declare const Properties: Component<{ children?: Snippet }>;
export declare const components: { Properties: typeof Properties };
