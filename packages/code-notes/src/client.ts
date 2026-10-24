import { css } from "./styles.ts";

/** Adds the code notes styles to the page once. The Vue, React, and Svelte components call it when they mount. */
export function addStyles(): void {
  if (document.querySelector("style[data-comark-code-notes]")) return;
  const style = document.createElement("style");
  style.dataset.comarkCodeNotes = "";
  style.textContent = css;
  document.head.append(style);
}

export { css };
