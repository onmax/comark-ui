import { css } from "./styles.ts";

/** Adds the styles to the page once. The Vue, React, and Svelte components call it when they mount. */
export function addStyles(): void {
  if (document.querySelector("style[data-comark-links],link[data-comark-links]")) return;
  const style = document.createElement("style");
  style.dataset.comarkLinks = "";
  style.textContent = css;
  document.head.append(style);
}

export { css };
export type { Anchor } from "./anchors.ts";
