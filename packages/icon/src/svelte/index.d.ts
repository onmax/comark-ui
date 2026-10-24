import type { Component } from "svelte";

export {
  createIcons,
  default,
  describeIconProblem,
  ICON_TAG,
  iconProblemRule,
  parseIconName,
} from "comark-icon";
export type {
  IconCollection,
  IconData,
  IconMeta,
  IconOptions,
  IconProblem,
  IconRule,
  Icons,
} from "comark-icon";

export declare const Icon: Component<{
  src?: string;
  ratio?: string | number;
  mask?: string | boolean;
  label?: string;
}>;
export declare const components: { Icon: typeof Icon };
