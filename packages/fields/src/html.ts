import type { NodeHandler, State } from "comark";
import { escapeHtml } from "comark/utils";
import { css } from "./styles.ts";

export { default } from "./index.ts";
export type { FieldAttributes, FieldsMeta } from "./index.ts";

// Each render gets a fresh `state.context`, so a document carries the styles once.
const styled = new WeakSet<object>();

const text = (value: unknown) =>
  // SAFETY: the parse plugin writes every attribute the renderer reads as a string.
  escapeHtml(String(value as string));
const styles = (state: State) => {
  if (styled.has(state.context)) return "";
  styled.add(state.context);
  return `<style data-comark-fields>${css}</style>`;
};

const field: NodeHandler = async (node, state) => {
  const [, attrs] = node;
  const head =
    (attrs.name ? `<code class="cfl-name">${text(attrs.name)}</code>` : "") +
    (attrs.type ? `<span class="cfl-type">${text(attrs.type)}</span>` : "") +
    (attrs.required ? '<span class="cfl-required">required</span>' : "") +
    (attrs.default
      ? `<span class="cfl-default">Default: <code>${text(attrs.default)}</code></span>`
      : "");
  return `${styles(state)}<div class="cfl"><div class="cfl-head">${head}</div><div class="cfl-body">${await state.flow(node, state)}</div></div>`;
};

const group: NodeHandler = async (node, state) =>
  `${styles(state)}<div class="cfl-group">${await state.flow(node, state)}</div>`;

/** The HTML renderer for `::field-group` and `::field`. Pass it as `components`; it inlines the styles once per document. */
export const components: Record<"field" | "field-group", NodeHandler> = {
  field,
  "field-group": group,
};
