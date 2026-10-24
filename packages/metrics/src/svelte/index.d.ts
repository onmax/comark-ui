import type { Component, Snippet } from "svelte";
import type { DeltaAttributes, ProgressAttributes } from "comark-metrics";

export { default, PROGRESS_TAG, STATS_TILES_TAG } from "comark-metrics";
export type { DeltaAttributes, MetricsMeta, ProgressAttributes } from "comark-metrics";

export declare const Delta: Component<DeltaAttributes>;
export declare const ProgressBar: Component<ProgressAttributes>;
export declare const StatTiles: Component<{ children?: Snippet }>;
export declare const components: {
  Delta: typeof Delta;
  ProgressBar: typeof ProgressBar;
  StatTiles: typeof StatTiles;
};
