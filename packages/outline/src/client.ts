import { css } from "./styles.ts";
import { addStyles as add } from "../../../shared/styles.ts";

export { start } from "./script.ts";

/** Adds the toc styles to the page once. The Vue, React, and Svelte components call it when they mount. */
export const addStyles = (): void => add("outline", css);

export { css };
