import { css } from "./styles.ts";
import { addStyles as add } from "../../../shared/styles.ts";

/** Adds the embed styles to the page once. The Vue, React, and Svelte components call it when they mount. */
export const addStyles = (): void => add("embed", css);

/** What every player may use. Each provider's own embed code asks for these. */
export const allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
// YouTube refuses to play without the page's origin, which `no-referrer` would withhold.
export const referrerPolicy = "strict-origin-when-cross-origin";

/**
 * Lucide's external-link, which follows a player's link, and globe, which starts a card (ISC), each as one path. Every
 * renderer draws them in the same `<svg>`, sized for a page without the styles.
 */
export const icons = {
  external: "M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",
  globe:
    "M2 12a10 10 0 1 0 20 0 10 10 0 1 0-20 0M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20",
};

export { css };
