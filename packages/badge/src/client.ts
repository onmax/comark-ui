import { css } from "./styles.ts";

/** Adds the badge styles to the page once. The Vue, React, and Svelte components call it when they mount. */
export function addStyles(): void {
  if (document.querySelector("style[data-comark-badge]")) return;
  const style = document.createElement("style");
  style.dataset.comarkBadge = "";
  style.textContent = css;
  document.head.append(style);
}

export { css };
