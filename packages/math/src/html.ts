import type { NodeHandler } from "comark";
import { escapeHtml } from "comark/utils";
import { classOf } from "./client.ts";
import { css } from "./styles.ts";
import { text } from "./text.ts";

export { default } from "./index.ts";
export type { FormulaAttributes, MathMeta, MathOptions, MathOutput } from "./index.ts";

// Each render gets a fresh `state.context`, so a document carries the styles once.
const styled = new WeakSet<object>();

const formula: NodeHandler = ([, attrs], state) => {
  const html = text(attrs.html);
  const styles = styled.has(state.context) ? "" : `<style data-comark-mathml>${css}</style>`;
  styled.add(state.context);
  // The plugin typeset `html` itself, with links and other trusted commands off.
  return `${styles}<span class="${classOf(attrs.display === true, !!html)}">${html || escapeHtml(text(attrs.tex))}</span>`;
};

/** The HTML renderer for math. Pass it as `components`; it inlines the styles once per document. */
export const components: Record<"formula", NodeHandler> = { formula };
