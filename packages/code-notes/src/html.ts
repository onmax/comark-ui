import type { NodeHandler } from "comark";
import { css } from "./styles.ts";

export { default, NOTES_TAG } from "./index.ts";
export type { CodeNotesAttributes, CodeNotesMeta } from "./index.ts";

// Each render gets a fresh `state.context`, so a document carries the styles once.
const styled = new WeakSet<object>();

const notes: NodeHandler = async ([, attrs, ...children], state) => {
  const styles = styled.has(state.context) ? "" : `<style data-comark-code-notes>${css}</style>`;
  styled.add(state.context);
  const start = Number(attrs.start);
  return (
    `${styles}<ol class="cn-notes"${Number.isInteger(start) && start !== 1 ? ` start="${start}"` : ""}>` +
    `${await state.flow(["div", {}, ...children], state)}</ol>`
  );
};

/** The HTML renderer for code notes. Pass it as `components`; it inlines the styles once per document. */
export const components: Record<"code-notes", NodeHandler> = { "code-notes": notes };
