// `:badge` for `@comark/svelte`. Pass `components` to it; the parse plugin comes from `comark-badge`.
import Badge from "./Badge.svelte";

export { colors, default } from "comark-badge";
export { Badge };
export const components = { Badge };
