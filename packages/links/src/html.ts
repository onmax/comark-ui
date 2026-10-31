import type { NodeHandler, State } from "comark";
import { escapeHtml, textContent } from "comark/utils";
import type { Anchor } from "./anchors.ts";
import { STYLES_TAG } from "./external.ts";
import { rawText } from "../../../shared/text.ts";
import { css } from "./styles.ts";

export { anchors, external, STYLES_TAG } from "./index.ts";
export type { Anchor, AnchorsOptions, ExternalOptions } from "./index.ts";

// Each render gets a fresh `state.context`, so a document carries the styles once.
const styled = new WeakSet<object>();

function styles(state: State): string {
  if (styled.has(state.context)) return "";
  styled.add(state.context);
  return `<style data-comark-links>${css}</style>`;
}

// The heading renders as it would without the plugin, and its link goes after it, outside its accessible name.
const heading: NodeHandler = async ([tag, { anchor, ...attrs }, ...children], state, parent) => {
  // The default handler writes the attributes Comark resolved for this node, not the node's own.
  const outer = state.renderData;
  const { anchor: _, ...props } = outer.props;
  state.renderData = { ...outer, props };
  try {
    const html = (await state.handlers.html([tag, attrs, ...children], state, parent)).trimEnd();
    const id = rawText(attrs.id);
    if (!anchor || !id) return html;
    // SAFETY: the parse plugin is the only writer of `anchor`, always as an `Anchor`.
    const { label, icon } = anchor as Anchor;
    return (
      `${styles(state)}<div class="cl-heading">${html}<a class="cl-anchor" href="#${escapeHtml(id)}">` +
      `<span aria-hidden="true">${escapeHtml(icon)}</span><span class="cl-sr">${escapeHtml(label)}</span></a></div>`
    );
  } finally {
    state.renderData = outer;
  }
};

// Comark's HTML renderer writes `aria-hidden="true"` as a bare `aria-hidden`, which screen readers ignore, so they would
// read the arrow out.
const span: NodeHandler = async (node, state, parent) =>
  node[1].class === "cl-icon"
    ? `<span class="cl-icon" aria-hidden="true">${escapeHtml(textContent(node))}</span>`
    : state.handlers.html(node, state, parent);

/** The HTML renderer for headings and the new-tab warning. Pass it as `components`. */
export const components: Record<
  "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "span" | typeof STYLES_TAG,
  NodeHandler
> = {
  h1: heading,
  h2: heading,
  h3: heading,
  h4: heading,
  h5: heading,
  h6: heading,
  span,
  [STYLES_TAG]: (_node, state) => styles(state),
};
