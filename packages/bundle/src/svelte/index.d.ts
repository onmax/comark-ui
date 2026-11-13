import type { Component, Snippet } from "svelte";
import type { BundleAttributes } from "comark-bundle";

export { default } from "comark-bundle";
export type {
  BundleAttributes,
  BundleLister,
  BundleMeta,
  BundleOptions,
  BundleReader,
} from "comark-bundle";

export declare const Bundle: Component<BundleAttributes & { children?: Snippet }>;
export declare const components: { Bundle: typeof Bundle };
