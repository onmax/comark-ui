import type { Component, Snippet } from "svelte";
import type { IconData } from "comark-icon";

export { colors, default, variants } from "comark-cards";
export type {
  CardAttributes,
  CardColor,
  CardVariant,
  CardsMeta,
  CardsOptions,
  ColumnsAttributes,
} from "comark-cards";

export declare const Card: Component<{
  color?: string;
  variant?: string;
  to?: string;
  target?: string;
  external?: string | boolean;
  label?: string;
  icon?: IconData;
  children?: Snippet;
}>;
export declare const CardTitle: Component<{ children?: Snippet }>;
export declare const CardGroup: Component<{ children?: Snippet }>;
export declare const Columns: Component<{ cols?: string | number; children?: Snippet }>;
export declare const Column: Component<{ children?: Snippet }>;
export declare const components: {
  Card: typeof Card;
  CardTitle: typeof CardTitle;
  CardGroup: typeof CardGroup;
  Columns: typeof Columns;
  Column: typeof Column;
};
