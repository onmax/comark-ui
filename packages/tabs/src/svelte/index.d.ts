import type { Component, Snippet } from "svelte";
import type { IconData } from "comark-icon";

export { default } from "comark-tabs";
export type { PackageManager, TabsMeta, TabsOptions } from "comark-tabs";

export declare const Tabs: Component<{
  labels?: string[];
  icons?: (IconData | null)[];
  sync?: string;
  code?: string | boolean;
  children?: Snippet;
}>;
export declare const TabsItem: Component<{
  label?: string;
  icon?: IconData;
  index?: string | number;
  children?: Snippet;
}>;
export declare const components: { Tabs: typeof Tabs; TabsItem: typeof TabsItem };
