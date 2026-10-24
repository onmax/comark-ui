// `:delta`, `:progress`, and `::stats` for `@comark/svelte`. Pass `components` to it; the parse plugin comes from `comark-metrics`.
import Delta from "./Delta.svelte";
import ProgressBar from "./ProgressBar.svelte";
import StatTiles from "./StatTiles.svelte";

export { default, PROGRESS_TAG, STATS_TILES_TAG } from "comark-metrics";
export { Delta, ProgressBar, StatTiles };
export const components = { Delta, ProgressBar, StatTiles };
