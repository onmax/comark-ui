import type { Component, Snippet } from "svelte";

export { colors, default } from "comark-badge";
export type { BadgeAttributes, BadgeColor, BadgeMeta, BadgeOptions } from "comark-badge";

export declare const Badge: Component<{
  color?: string;
  src?: string;
  label?: string;
  children?: Snippet;
}>;
export declare const components: { Badge: typeof Badge };
