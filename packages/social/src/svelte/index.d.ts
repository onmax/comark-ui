import type { Component, Snippet } from "svelte";
import type { ConversationAttributes, PostAttributes, ThreadAttributes } from "comark-social";

export { default } from "comark-social";
export type {
  ConversationAttributes,
  PostAttributes,
  SocialMeta,
  SocialOptions,
  ThreadAttributes,
} from "comark-social";

export declare const Post: Component<PostAttributes & { children?: Snippet }>;
export declare const Thread: Component<ThreadAttributes & { children?: Snippet }>;
export declare const Conversation: Component<ConversationAttributes & { children?: Snippet }>;
export declare const components: {
  Post: typeof Post;
  Thread: typeof Thread;
  Conversation: typeof Conversation;
};
