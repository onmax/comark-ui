// Videos and audio for `@comark/svelte`. Pass `components` to it; the parse plugin comes from `comark-media`.
import Media from "./Media.svelte";

export { default } from "comark-media";
export { Media };
export const components = { Media };
