import type { Component, Snippet } from "svelte";
import type { FormulaAttributes } from "comark-mathml";

export { default, KATEX_TAGS, MATHML_TAGS } from "comark-mathml";
export type { FormulaAttributes, MathMeta, MathOptions, MathOutput } from "comark-mathml";

export declare const Formula: Component<FormulaAttributes & { children?: Snippet }>;
export declare const components: { Formula: typeof Formula };
