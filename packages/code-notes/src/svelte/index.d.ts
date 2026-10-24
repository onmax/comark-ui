import type { Component, Snippet } from "svelte";
import type { CodeNotesAttributes } from "comark-code-notes";

export { default, NOTES_TAG } from "comark-code-notes";
export type { CodeNotesAttributes, CodeNotesMeta } from "comark-code-notes";

export declare const CodeNotes: Component<CodeNotesAttributes & { children?: Snippet }>;
export declare const components: { CodeNotes: typeof CodeNotes };
