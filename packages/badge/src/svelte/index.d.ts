import type { Component, Snippet } from "svelte";

export { colors, default } from "comark-badge";
export type { BadgeAttributes, BadgeColor, BadgeMeta } from "comark-badge";

export declare const Badge: Component<{ color?: string; children?: Snippet }>;
export declare const components: { Badge: typeof Badge };
