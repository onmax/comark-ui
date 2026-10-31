import { css } from "./styles.ts";
import { addStyles as add } from "../../../shared/styles.ts";

/** Adds the cast styles to the page once. The Vue, React, and Svelte components call it when they mount. */
export const addStyles = (): void => add("cast", css);

export { css };
