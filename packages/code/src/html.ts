import type { NodeHandler, State } from "comark";
import { parts, start, withoutOwn as strip } from "./client.ts";
import { css } from "./styles.ts";

export { default } from "./index.ts";
export type { CodeAction, CodeMeta, CodeOptions } from "./index.ts";
export type { CodeActionDetail } from "./client.ts";

// Each render gets a fresh `state.context`, so a document carries the script once.
const started = new WeakSet<object>();

/** The button script as one inline `<script>`, once per render. */
export function runtime(state: State): string {
  if (started.has(state.context)) return "";
  started.add(state.context);
  // The styles come inline before the script, so the script has nothing to add.
  return `<style data-comark-code>${css}</style><script>(${start.toString()})("")</script>`;
}

// Every value is a word or a number the parse plugin wrote, so none needs escaping.
const attributesOf = (attributes: Record<string, string>) =>
  Object.entries(attributes)
    .map(([key, value]) => (value ? ` ${key}="${value}"` : ` ${key}`))
    .join("");

// The block renders as it would without the plugin, so Shiki's classes and the host's `pre` styles still apply. The
// script goes inside the wrapper, where it can't become the first or last child a host's rule picks.
const pre: NodeHandler = async ([tag, attributes, ...children], state, parent) => {
  const { wrapper, bar } = parts(attributes);
  // The default handler writes the attributes Comark resolved for this node, not the node's own.
  const outer = state.renderData;
  state.renderData = { ...outer, props: strip(outer.props) };
  try {
    const block = await state.handlers.html([tag, strip(attributes), ...children], state, parent);
    return (
      // Comark puts a newline around every child it takes for a block, which inside `pre` would show as an empty line
      // around each collapsed range. The code's own text can't hold a tag, so only Comark's newlines match.
      `<div${attributesOf(wrapper)}>${block.trimEnd().replace(/\n(?=<details class="ck-fold">)|(?<=<\/summary>|<\/details>)\n/g, "")}` +
      `<div class="ck-bar">${bar}</div>${runtime(state)}</div>`
    );
  } finally {
    state.renderData = outer;
  }
};

/** The HTML renderer for code blocks. Pass it as `components`. */
export const components: Record<"pre", NodeHandler> = { pre };
