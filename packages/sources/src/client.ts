import { css } from "./styles.ts";

/** Adds the sources styles to the page once. The Vue, React, and Svelte components call it when they mount. */
export function addStyles(): void {
  if (document.querySelector("style[data-comark-sources]")) return;
  const style = document.createElement("style");
  style.dataset.comarkSources = "";
  style.textContent = css;
  document.head.append(style);
}

export { css };
