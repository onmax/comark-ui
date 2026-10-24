import type { Component, Snippet } from "svelte";
import type { ColorAttributes } from "comark-colors";

export { default, isColor } from "comark-colors";
export type { ColorAttributes, ColorsMeta } from "comark-colors";

export declare const Color: Component<ColorAttributes>;
export declare const Palette: Component<{ children?: Snippet }>;
export declare const components: { Color: typeof Color; Palette: typeof Palette };
