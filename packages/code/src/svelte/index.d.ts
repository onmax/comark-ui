import type { Component, Snippet } from "svelte";
import type { CodeAction } from "comark-code";

export { default } from "comark-code";
export type { CodeAction, CodeMeta, CodeOptions } from "comark-code";

export declare const Pre: Component<{
  actions?: CodeAction[];
  children?: Snippet;
  [attribute: string]: unknown;
}>;
export declare const components: { Pre: typeof Pre };
