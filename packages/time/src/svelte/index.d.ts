import type { Component } from "svelte";
import type { TimeAttributes } from "comark-time";

export { default, TIME_TAG } from "comark-time";
export type { TimeAttributes, TimeMeta, TimeOptions } from "comark-time";

export declare const RelativeTime: Component<TimeAttributes>;
export declare const components: { RelativeTime: typeof RelativeTime };
