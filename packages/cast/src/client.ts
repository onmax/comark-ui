import { css } from "./styles.ts";

/** Adds the cast styles to the page once. The Vue, React, and Svelte components call it when they mount. */
export function addStyles(): void {
  if (document.querySelector("style[data-comark-cast]")) return;
  const style = document.createElement("style");
  style.dataset.comarkCast = "";
  style.textContent = css;
  document.head.append(style);
}

export { css };
