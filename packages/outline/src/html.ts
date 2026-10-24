import type { NodeHandler } from "comark";
import { escapeHtml } from "comark/utils";
import { css } from "./styles.ts";

export { default } from "./index.ts";
export type { TocAttributes, OutlineMeta } from "./index.ts";

// Each render gets a fresh `state.context`, so a document carries the styles once.
const styled = new WeakSet<object>();

const attr = (value: string) => escapeHtml(value, { '"': "&quot;" });
// SAFETY: the parse plugin writes every attribute the renderer reads as a string.
const str = (value: unknown) => (value === undefined ? "" : String(value as string));

const toc: NodeHandler = async ([, attrs, ...children], state) => {
  if (!children.length) return "";
  const title = str(attrs.title);
  const styles = styled.has(state.context) ? "" : `<style data-comark-outline>${css}</style>`;
  styled.add(state.context);
  const list = (await Promise.all(children.map((child) => state.one(child, state)))).join("");
  return `${styles}<nav class="cto" aria-label="${attr(title || "Contents")}">${title ? `<p class="cto-title">${attr(title)}</p>` : ""}${list}</nav>`;
};

/** The HTML renderer for `::toc`. Pass it as `components`; it inlines the styles once per document. */
export const components: Record<"toc", NodeHandler> = { toc };
