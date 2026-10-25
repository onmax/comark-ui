import { css } from "./styles.ts";

/** Adds the math styles to the page once. The Vue, React, and Svelte components call it when they mount. */
export function addStyles(): void {
  if (document.querySelector("style[data-comark-math]")) return;
  const style = document.createElement("style");
  style.dataset.comarkMath = "";
  style.textContent = css;
  document.head.append(style);
}

/** The class of a formula's `span`: display math is a block, and one that couldn't be typeset shows its TeX. */
export const classOf = (display: boolean | undefined, typeset: boolean) =>
  `cmh${display ? " cmh-display" : ""}${typeset ? "" : " cmh-source"}`;

export { css };
