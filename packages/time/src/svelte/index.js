// `:time` for `@comark/svelte`. Pass `components` to it; the parse plugin comes from `comark-time`.
import RelativeTime from "./RelativeTime.svelte";

export { default, TIME_TAG } from "comark-time";
export { RelativeTime };
export const components = { RelativeTime };
