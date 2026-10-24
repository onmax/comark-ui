// Headings for `@comark/svelte`. Pass `components` to it; the parse plugins come from `comark-links`.
import H1 from "./H1.svelte";
import H2 from "./H2.svelte";
import H3 from "./H3.svelte";
import H4 from "./H4.svelte";
import H5 from "./H5.svelte";
import H6 from "./H6.svelte";
import LinksStyles from "./LinksStyles.svelte";

export { anchors, external, STYLES_TAG } from "comark-links";
export { H1, H2, H3, H4, H5, H6, LinksStyles };
export const components = { H1, H2, H3, H4, H5, H6, LinksStyles };
