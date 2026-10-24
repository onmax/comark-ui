// Diagrams for `@comark/svelte`. Pass `components` to it; the parse plugin comes from `comark-diagrams`.
import Diagram from "./Diagram.svelte";

export { default, LANGUAGES, sanitizeSvg } from "comark-diagrams";
export { Diagram };
export const components = { Diagram };
