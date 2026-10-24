import type { Component, Snippet } from "svelte";
import type { TestsAttributes } from "comark-tests";

export { default } from "comark-tests";
export type { TestsAttributes, TestsMeta, TestsOptions, TestsReader } from "comark-tests";

export declare const Tests: Component<TestsAttributes & { children?: Snippet }>;
export declare const components: { Tests: typeof Tests };
