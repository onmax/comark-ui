// `::toc` and the side outline for `@comark/svelte`. Pass `components` to it; the parse plugin comes from
// `comark-outline`.
import Toc from "./Toc.svelte";
import TocRail from "./TocRail.svelte";

export { default, RAIL_TAG } from "comark-outline";
export { Toc, TocRail };
export const components = { Toc, TocRail };
