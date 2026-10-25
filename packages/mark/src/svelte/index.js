// Highlights and superscripts for `@comark/svelte`. Pass `components` to it; the parse plugin comes from `comark-mark`.
import Mark from "./Mark.svelte";
import Sup from "./Sup.svelte";

export { default } from "comark-mark";
export { Mark, Sup };
export const components = { Mark, Sup };
