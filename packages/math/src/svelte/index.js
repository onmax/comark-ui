// Math for `@comark/svelte`. Pass `components` to it; the parse plugin comes from `comark-mathml`.
import Formula from "./Formula.svelte";

export { default } from "comark-mathml";
export { Formula };
export const components = { Formula };
