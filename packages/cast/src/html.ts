import type { Node, NodeHandler } from "comark";
import { escapeHtml } from "comark/utils";
import { css } from "./styles.ts";

export { default } from "./index.ts";
export type { CastAttributes, CastMeta, CastOptions, CastReader } from "./index.ts";

// Each render gets a fresh `state.context`, so a document carries the styles once.
const styled = new WeakSet<object>();

const attr = (value: string) => escapeHtml(value, { '"': "&quot;" });
// SAFETY: the parse plugin writes every attribute the renderer reads as a string.
const str = (value: unknown) => (value === undefined ? "" : String(value as string));

// The parse plugin writes only text and spans of text. They're written here rather than by the renderer, which would
// break the lines of a `pre` around each span.
const write = (node: Node): string => {
  if (!Array.isArray(node)) return escapeHtml(node);
  const [tag, attrs, ...children] = node;
  if (tag !== "span") return "";
  const className = str(attrs.class);
  const style = str(attrs.style);
  return `<span${className ? ` class="${attr(className)}"` : ""}${style ? ` style="${attr(style)}"` : ""}>${children.map(write).join("")}</span>`;
};

const cast: NodeHandler = ([, attrs, ...children], state) => {
  const mode = str(attrs.mode);
  const title = str(attrs.title);
  if (!mode) return "";
  const styles = styled.has(state.context) ? "" : `<style data-comark-cast>${css}</style>`;
  styled.add(state.context);
  return (
    `${styles}<figure class="cca" data-mode="${attr(mode)}">${title ? `<figcaption>${attr(title)}</figcaption>` : ""}` +
    `<pre class="cca-term">${children.map(write).join("")}</pre></figure>`
  );
};

/** The HTML renderer for `::cast`. Pass it as `components`; it inlines the styles once per document. */
export const components: Record<"cast", NodeHandler> = { cast };
