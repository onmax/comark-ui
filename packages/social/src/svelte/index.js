// `::post` and `::conversation` for `@comark/svelte`. Pass `components` to it; the parse plugin comes from `comark-social`.
import Conversation from "./Conversation.svelte";
import Post from "./Post.svelte";

export { default } from "comark-social";
export { Conversation, Post };
export const components = { Post, Conversation };
