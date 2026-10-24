import { css } from "./styles.ts";

/** Adds the card styles to the page once. The Vue, React, and Svelte components call it when they mount. */
export function addStyles(): void {
  if (document.querySelector("style[data-comark-cards]")) return;
  const style = document.createElement("style");
  style.dataset.comarkCards = "";
  style.textContent = css;
  document.head.append(style);
}

/** Lucide's arrow-up-right (ISC), drawn in the corner of a card that opens in a new tab. */
export const external = "M7 7h10v10M7 17 17 7";

/** Returns whether a card URL is safe to place in an href. */
export const isSafeHref = (value?: string): boolean =>
  !!value && !/^\s*(?:javascript|vbscript|data):/i.test(value);

/** Web URLs open in a new tab, including protocol-relative URLs. */
export const isExternalHref = (value?: string): boolean =>
  /^(?:https?:\/\/|\/\/)/i.test(value ?? "");

/** The `rel` of a link that opens in a new tab, so the page it opens can't reach back into this one. */
export const rel = (target?: string): string | undefined =>
  target === "_blank" ? "noopener noreferrer" : undefined;

export { css };
