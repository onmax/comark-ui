import type { Component, Snippet } from "svelte";

export { default } from "comark-fields";
export type { FieldAttributes, FieldsMeta } from "comark-fields";

export declare const Field: Component<{
  name?: string;
  type?: string;
  required?: string | boolean;
  default?: string;
  children?: Snippet;
}>;
export declare const FieldGroup: Component<{ children?: Snippet }>;
export declare const components: { Field: typeof Field; FieldGroup: typeof FieldGroup };
