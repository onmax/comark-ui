import type { Component, Snippet } from "svelte";
import type { ConversationAttributes, PostAttributes } from "comark-social";

export { default } from "comark-social";
export type {
  ConversationAttributes,
  PostAttributes,
  SocialMeta,
  SocialOptions,
} from "comark-social";

export declare const Post: Component<PostAttributes & { children?: Snippet }>;
export declare const Conversation: Component<ConversationAttributes & { children?: Snippet }>;
export declare const components: { Post: typeof Post; Conversation: typeof Conversation };
