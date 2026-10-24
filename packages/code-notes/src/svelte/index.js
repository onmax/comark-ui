// The notes under an annotated fence, for `@comark/svelte`. Pass `components` to it; the parse plugin comes from `comark-code-notes`.
import CodeNotes from "./CodeNotes.svelte";

export { default, NOTES_TAG } from "comark-code-notes";
export { CodeNotes };
export const components = { CodeNotes };
