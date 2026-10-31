import type { Node, NodeHandler } from "comark";
import { escapeHtml } from "comark/utils";
import { css } from "./styles.ts";
import { rawText } from "../../../shared/text.ts";
import { attr } from "../../../shared/html.ts";

export { default } from "./index.ts";
export type { CastAttributes, CastMeta, CastOptions, CastReader } from "./index.ts";

// Each render gets a fresh `state.context`, so a document carries the styles once.
const styled = new WeakSet<object>();

// The parse plugin writes only text and spans of text. They're written here rather than by the renderer, which would
// break the lines of a `pre` around each span.
const write = (node: Node): string => {
  if (!Array.isArray(node)) return escapeHtml(node);
  const [tag, attrs, ...children] = node;
  if (tag !== "span") return "";
  const className = rawText(attrs.class);
  const style = rawText(attrs.style);
  return `<span${className ? ` class="${attr(className)}"` : ""}${style ? ` style="${attr(style)}"` : ""}>${children.map(write).join("")}</span>`;
};

const cast: NodeHandler = ([, attrs, ...children], state) => {
  const mode = rawText(attrs.mode);
  const title = rawText(attrs.title);
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
