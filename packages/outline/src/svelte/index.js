// `::toc` for `@comark/svelte`. Pass `components` to it; the parse plugin comes from `comark-outline`.
import Toc from "./Toc.svelte";

export { default } from "comark-outline";
export { Toc };
export const components = { Toc };
