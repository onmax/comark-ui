import type { Component, Snippet } from "svelte";
import type { PostAttributes } from "comark-social";

export { default } from "comark-social";
export type { PostAttributes, SocialMeta, SocialOptions } from "comark-social";

export declare const Post: Component<PostAttributes & { children?: Snippet }>;
export declare const components: { Post: typeof Post };
