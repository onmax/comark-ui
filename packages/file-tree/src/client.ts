import { css } from "./styles.ts";
import { addStyles as add } from "../../../shared/styles.ts";

/** Adds the file tree styles to the page once. The Vue, React, and Svelte components call it when they mount. */
export const addStyles = (): void => add("file-tree", css);

/**
 * Lucide's folder and file (ISC), each as one path, for entries without an icon. Every renderer draws them in the
 * same `<svg>`, sized for a page without the styles.
 */
export const glyphs = {
  folder:
    "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z",
  file: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7ZM14 2v4a2 2 0 0 0 2 2h4",
};

/** The sign before an entry's name, so its change reads without color. */
export const marks = new Map([
  ["added", "+"],
  ["removed", "-"],
  ["changed", "~"],
]);

export { css };
