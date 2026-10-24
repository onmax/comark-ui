import { createElement, type ReactNode, useEffect } from "react";
import { addStyles } from "./client.ts";
import type { CodeNotesAttributes } from "./index.ts";

export { default, NOTES_TAG } from "./index.ts";
export type { CodeNotesAttributes, CodeNotesMeta } from "./index.ts";

/** The notes under an annotated fence, for `@comark/react`. */
export function CodeNotes({ start, children }: CodeNotesAttributes & { children?: ReactNode }) {
  useEffect(addStyles, []);
  return createElement(
    "ol",
    { className: "cn-notes", start: start && start !== 1 ? start : undefined },
    children,
  );
}

/** Pass these as `components` to `@comark/react`. */
export const components = { CodeNotes };
