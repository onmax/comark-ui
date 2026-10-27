import type { Component, Snippet } from "svelte";

export { default } from "comark-magic-move";
export type { MagicMoveMeta } from "comark-magic-move";

export declare const MagicMove: Component<{
  count?: string | number;
  title?: string;
  children?: Snippet;
}>;
export declare const MagicMoveStep: Component<{
  index?: string | number;
  count?: string | number;
  label?: string;
  children?: Snippet;
}>;
export declare const components: {
  MagicMove: typeof MagicMove;
  MagicMoveStep: typeof MagicMoveStep;
};
