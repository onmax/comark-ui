import type { NodeHandler } from "comark";
import { css } from "./styles.ts";
import { rawText } from "../../../shared/text.ts";
import { attr } from "../../../shared/html.ts";

export { default, isColor } from "./index.ts";
export type { ColorAttributes, ColorsMeta } from "./index.ts";

// Each render gets a fresh `state.context`, so a document carries the styles once.
const styled = new WeakSet<object>();

const styles = (state: { context: object }) => {
  const tag = styled.has(state.context) ? "" : `<style data-comark-colors>${css}</style>`;
  styled.add(state.context);
  return tag;
};

const color: NodeHandler = ([, attrs], state) => {
  const value = rawText(attrs.value);
  const name = rawText(attrs.name);
  if (!value) return "";
  if (name)
    return `<li><span class="cco-tile" style="--cco:${attr(value)}"></span><span class="cco-name">${attr(name)}</span><span class="cco-value">${attr(value)}</span></li>`;
  return `${styles(state)}<code class="cco"><span class="cco-swatch" style="--cco:${attr(value)}" aria-hidden="true"></span>${attr(value)}</code>`;
};

const palette: NodeHandler = async ([, , ...children], state) =>
  `${styles(state)}<ul class="cco-palette">${(await Promise.all(children.map((child) => state.one(child, state)))).join("")}</ul>`;

/** The HTML renderer for colors and `::palette`. Pass it as `components`; it inlines the styles once per document. */
export const components: Record<"color" | "palette", NodeHandler> = { color, palette };
