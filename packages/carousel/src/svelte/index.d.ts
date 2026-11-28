import type { Component, Snippet } from "svelte";

export { default } from "comark-carousel";

export declare const Carousel: Component<{
  count?: string | number;
  columns?: string | number;
  title?: string;
  zoom?: boolean | string;
  children?: Snippet;
}>;
export declare const Slide: Component<{
  index?: string | number;
  count?: string | number;
  title?: string;
  photo?: boolean;
  zoom?: boolean | string;
  children?: Snippet;
}>;
export declare const components: { Carousel: typeof Carousel; Slide: typeof Slide };
