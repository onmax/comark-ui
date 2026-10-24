import type { NodeHandler } from "comark";
import { escapeHtml } from "comark/utils";
import { css } from "./styles.ts";

export { default, isColor } from "./index.ts";
export type { ColorAttributes, ColorsMeta } from "./index.ts";

// Each render gets a fresh `state.context`, so a document carries the styles once.
const styled = new WeakSet<object>();

const attr = (value: string) => escapeHtml(value, { '"': "&quot;" });
// SAFETY: the parse plugin writes every attribute the renderer reads as a string.
const str = (value: unknown) => (value === undefined ? "" : String(value as string));
const styles = (state: { context: object }) => {
  const tag = styled.has(state.context) ? "" : `<style data-comark-colors>${css}</style>`;
  styled.add(state.context);
  return tag;
};

const color: NodeHandler = ([, attrs], state) => {
  const value = str(attrs.value);
  const name = str(attrs.name);
  if (!value) return "";
  if (name)
    return `<li><span class="cco-tile" style="--cco:${attr(value)}"></span><span class="cco-name">${attr(name)}</span><span class="cco-value">${attr(value)}</span></li>`;
  return `${styles(state)}<code class="cco"><span class="cco-swatch" style="--cco:${attr(value)}" aria-hidden="true"></span>${attr(value)}</code>`;
};

const palette: NodeHandler = async ([, , ...children], state) =>
  `${styles(state)}<ul class="cco-palette">${(await Promise.all(children.map((child) => state.one(child, state)))).join("")}</ul>`;

/** The HTML renderer for colors and `::palette`. Pass it as `components`; it inlines the styles once per document. */
export const components: Record<"color" | "palette", NodeHandler> = { color, palette };
