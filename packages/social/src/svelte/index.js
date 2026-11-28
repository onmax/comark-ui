// `::post` and `::thread` for `@comark/svelte`. Pass `components` to it; the parse plugin comes from `comark-social`.
import Post from "./Post.svelte";
import Thread from "./Thread.svelte";

export { default } from "comark-social";
export { Post, Thread };
export const components = { Post, Thread };
