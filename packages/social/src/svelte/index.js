// `::post` for `@comark/svelte`. Pass `components` to it; the parse plugin comes from `comark-social`.
import Post from "./Post.svelte";

export { default } from "comark-social";
export { Post };
export const components = { Post };
