// Colors and `::palette` for `@comark/svelte`. Pass `components` to it; the parse plugin comes from `comark-colors`.
import Color from "./Color.svelte";
import Palette from "./Palette.svelte";

export { default, isColor } from "comark-colors";
export { Color, Palette };
export const components = { Color, Palette };
