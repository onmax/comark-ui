import type { Component } from "svelte";
import type { FormulaAttributes } from "comark-mathml";

export { default } from "comark-mathml";
export type { FormulaAttributes, MathMeta, MathOptions, MathOutput } from "comark-mathml";

export declare const Formula: Component<FormulaAttributes>;
export declare const components: { Formula: typeof Formula };
