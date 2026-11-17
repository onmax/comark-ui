// Math for `@comark/svelte`. Pass `components` to it; the parse plugin comes from `comark-mathml`.
import Formula from "./Formula.svelte";

export { default, KATEX_TAGS, MATHML_TAGS } from "comark-mathml";
export { Formula };
export const components = { Formula };
