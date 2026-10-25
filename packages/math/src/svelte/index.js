// Math for `@comark/svelte`. Pass `components` to it; the parse plugin comes from `comark-math`.
import Formula from "./Formula.svelte";

export { default } from "comark-math";
export { Formula };
export const components = { Formula };
