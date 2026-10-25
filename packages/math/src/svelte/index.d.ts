import type { Component } from "svelte";
import type { FormulaAttributes } from "comark-math";

export { default } from "comark-math";
export type { FormulaAttributes, MathMeta, MathOptions, MathOutput } from "comark-math";

export declare const Formula: Component<FormulaAttributes>;
export declare const components: { Formula: typeof Formula };
