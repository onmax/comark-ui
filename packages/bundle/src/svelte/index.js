// `::bundle` for `@comark/svelte`. Pass `components` to it; the parse plugin comes from `comark-bundle`.
import Bundle from "./Bundle.svelte";

export { default } from "comark-bundle";
export { Bundle };
export const components = { Bundle };
