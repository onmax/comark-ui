import type { NodeHandler } from "comark";
import { escapeHtml } from "comark/utils";
import { css } from "./styles.ts";

export { default } from "./index.ts";
export type { SourcesAttributes, SourcesMeta } from "./index.ts";

// Each render gets a fresh `state.context`, so a document carries the styles once.
const styled = new WeakSet<object>();

const attr = (value: string) => escapeHtml(value, { '"': "&quot;" });
// SAFETY: the parse plugin writes every attribute the renderer reads as a string.
const str = (value: unknown) => (value === undefined ? "" : String(value as string));

const sources: NodeHandler = async ([, attrs, ...children], state) => {
  if (!children.length) return "";
  const title = str(attrs.title) || "Sources";
  const styles = styled.has(state.context) ? "" : `<style data-comark-sources>${css}</style>`;
  styled.add(state.context);
  const list = (await Promise.all(children.map((child) => state.one(child, state)))).join("");
  return `${styles}<section class="cso" aria-label="${attr(title)}"><p class="cso-title">${attr(title)}</p>${list}</section>`;
};

/** The HTML renderer for `::sources`. Pass it as `components`; it inlines the styles once per document. */
export const components: Record<"sources", NodeHandler> = { sources };
