import type { Component, Snippet } from "svelte";
import type { SourcesAttributes } from "comark-sources";

export { default } from "comark-sources";
export type { SourcesAttributes, SourcesMeta } from "comark-sources";

export declare const Sources: Component<SourcesAttributes & { children?: Snippet }>;
export declare const components: { Sources: typeof Sources };
