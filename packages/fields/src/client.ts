import { css } from "./styles.ts";

/** Adds the field styles to the page once. The Vue, React, and Svelte components call it when they mount. */
export function addStyles(): void {
  if (document.querySelector("style[data-comark-fields]")) return;
  const style = document.createElement("style");
  style.dataset.comarkFields = "";
  style.textContent = css;
  document.head.append(style);
}

export { css };
