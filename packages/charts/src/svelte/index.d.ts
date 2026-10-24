import type { Component, Snippet } from "svelte";

export { default } from "comark-charts";
export type { ChartsMeta, ChartsOptions, DrawnChart } from "comark-charts";

export declare const Chart: Component<{
  type?: string;
  title?: string;
  svg?: string;
  children?: Snippet;
}>;
export declare const components: { Chart: typeof Chart };
