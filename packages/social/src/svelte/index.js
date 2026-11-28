// `::post`, `::thread`, and `::conversation` for `@comark/svelte`. Pass `components` to it; the parse plugin comes from `comark-social`.
import Conversation from "./Conversation.svelte";
import Post from "./Post.svelte";
import Thread from "./Thread.svelte";

export { default } from "comark-social";
export { Conversation, Post, Thread };
export const components = { Conversation, Post, Thread };
