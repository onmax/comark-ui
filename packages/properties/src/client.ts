import { css } from "./styles.ts";
import { addStyles as add } from "../../../shared/styles.ts";

/** Adds the properties styles to the page once. The Vue, React, and Svelte components call it when they mount. */
export const addStyles = (): void => add("properties", css);

/**
 * Rewrites each date in the properties boxes under `root` in the reader's locale. A date the `locale` option fixed
 * keeps its `lang` and stays as written. The HTML renderer inlines this function, so it uses nothing from outside it.
 */
export function localizeDates(root: ParentNode): void {
  for (const time of root.querySelectorAll<HTMLTimeElement>(".cfm time[datetime]:not([lang])")) {
    const date = new Date(`${time.dateTime}T00:00:00Z`);
    time.textContent = date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  }
}

export { css };
