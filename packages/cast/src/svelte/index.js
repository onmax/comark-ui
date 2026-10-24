// `::cast` for `@comark/svelte`. Pass `components` to it; the parse plugin comes from `comark-cast`.
import Cast from "./Cast.svelte";

export { default } from "comark-cast";
export { Cast };
export const components = { Cast };
