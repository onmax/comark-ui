import { css } from "./styles.ts";

/** Adds the steps styles to the page once. The Vue, React, and Svelte components call it when they mount. */
export function addStyles(): void {
  if (document.querySelector("style[data-comark-steps]")) return;
  const style = document.createElement("style");
  style.dataset.comarkSteps = "";
  style.textContent = css;
  document.head.append(style);
}

/** Where the counter starts, so a list's `start` numbers the steps from it. Undefined when they start at 1. */
export const counterReset = (start: unknown): string | undefined => {
  const from = Number(start);
  return Number.isSafeInteger(from) && from > 1 ? `cs-step ${from - 1}` : undefined;
};

export { css };
