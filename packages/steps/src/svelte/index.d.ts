import type { Component, Snippet } from "svelte";

export { default } from "comark-steps";
export type { StepAttributes, StepsAttributes, StepsMeta } from "comark-steps";

export declare const Steps: Component<{ start?: string | number; children?: Snippet }>;
export declare const Step: Component<{ index?: string | number; children?: Snippet }>;
export declare const components: { Steps: typeof Steps; Step: typeof Step };
