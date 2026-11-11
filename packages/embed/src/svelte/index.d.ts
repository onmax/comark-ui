import type { Component } from "svelte";
import type { EmbedAttributes } from "comark-embed";

export { default } from "comark-embed";
export type { EmbedAttributes, EmbedMeta, EmbedOptions, Player, Size } from "comark-embed";

export declare const Embed: Component<EmbedAttributes>;
export declare const components: { Embed: typeof Embed };
