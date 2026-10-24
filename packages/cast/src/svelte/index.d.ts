import type { Component, Snippet } from "svelte";
import type { CastAttributes } from "comark-cast";

export { default } from "comark-cast";
export type { CastAttributes, CastMeta, CastOptions, CastReader } from "comark-cast";

export declare const Cast: Component<CastAttributes & { children?: Snippet }>;
export declare const components: { Cast: typeof Cast };
