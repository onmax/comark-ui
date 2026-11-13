import { css } from "./styles.ts";
import { addStyles as add } from "../../../shared/styles.ts";

/** Adds the bundle report styles to the page once. The Vue, React, and Svelte components call it when they mount. */
export const addStyles = (): void => add("bundle", css);

export { css };
