// `:qr` for `@comark/svelte`. Pass `components` to it; the parse plugin comes from `comark-qr`.
import Qr from "./Qr.svelte";

export { default } from "comark-qr";
export { Qr };
export const components = { Qr };
