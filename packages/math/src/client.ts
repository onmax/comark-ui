import { css } from "./styles.ts";
import { addStyles as add } from "../../../shared/styles.ts";

/** Adds the math styles to the page once. The Vue, React, and Svelte components call it when they mount. */
export const addStyles = (): void => add("mathml", css);

/** The class of a formula's `span`: display math is a block, and one that couldn't be typeset shows its TeX. */
export const classOf = (display: boolean | undefined, typeset: boolean) =>
  `cmh${display ? " cmh-display" : ""}${typeset ? "" : " cmh-source"}`;

export { css };
