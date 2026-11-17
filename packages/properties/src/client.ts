import { css as timeCss, relativize, start as startTime } from "comark-time/client";
import { css } from "./styles.ts";
import { addStyles as add } from "../../../shared/styles.ts";

/** Adds the properties styles to the page once. */
export const addStyles = (): void => add("properties", css);

/**
 * What the Vue, React, and Svelte boxes run once mounted: adds the box's styles and comark-time's, lets Escape close a
 * date's tooltip, and keeps each date under `box` relative to the reader's clock, as comark-time's `relativize` does.
 * Returns a function that stops it.
 */
export function start(box: ParentNode & Node): () => void {
  addStyles();
  const stopTime = startTime(timeCss);
  const stopDates = relativize(box);
  return () => {
    stopDates();
    stopTime();
  };
}

export { css, relativize };
