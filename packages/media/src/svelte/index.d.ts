import type { Component } from "svelte";
import type { MediaAttributes } from "comark-media";

export { default } from "comark-media";
export type { MediaAttributes, MediaMeta, MediaOptions } from "comark-media";

export declare const Media: Component<MediaAttributes>;
export declare const components: { Media: typeof Media };
