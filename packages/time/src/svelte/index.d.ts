import type { Component } from "svelte";
import type { TimeAttributes } from "comark-time";

export { default, describeTime, TIME_TAG } from "comark-time";
export type {
  DescribeTimeOptions,
  TimeAttributes,
  TimeDescription,
  TimeMeta,
  TimeOptions,
} from "comark-time";

export declare const RelativeTime: Component<TimeAttributes>;
export declare const components: { RelativeTime: typeof RelativeTime };
