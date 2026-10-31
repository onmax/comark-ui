import { css } from "./styles.ts";
import { addStyles as add } from "../../../shared/styles.ts";

/** Adds the QR styles to the page once. The Vue, React, and Svelte components call it when they mount. */
export const addStyles = (): void => add("qr", css);

/** The SVG's view box: the code and its two-module quiet zone, which the parse plugin already counts in `size`. */
export const viewBox = (size: number) => `0 0 ${size} ${size}`;

export { css };
