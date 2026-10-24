import { css } from "./styles.ts";

/** Adds the QR styles to the page once. The Vue, React, and Svelte components call it when they mount. */
export function addStyles(): void {
  if (document.querySelector("style[data-comark-qr]")) return;
  const style = document.createElement("style");
  style.dataset.comarkQr = "";
  style.textContent = css;
  document.head.append(style);
}

/** The SVG's view box: the code and its two-module quiet zone, which the parse plugin already counts in `size`. */
export const viewBox = (size: number) => `0 0 ${size} ${size}`;

export { css };
