import type { NodeHandler } from "comark";
import { escapeHtml } from "comark/utils";
import { CHIP_TAG } from "./index.ts";
import { css } from "./styles.ts";

export { CHIP_TAG, default } from "./index.ts";
export type { ChipsMeta, ChipsOptions } from "./index.ts";
export { css };

const attr = (value: string) => escapeHtml(value, { '"': "&quot;" });
// SAFETY: the parse plugin writes every attribute the renderer reads as a string.
const str = (value: unknown) => (value === undefined ? "" : String(value as string));

// Each render gets a fresh `state.context`, so a document carries the styles once.
const styled = new WeakSet<object>();

const chip: NodeHandler = async (node, state) => {
  const [, attrs, ...children] = node;
  const styles = styled.has(state.context) ? "" : `<style data-comark-chips>${css}</style>`;
  styled.add(state.context);
  const src = str(attrs.src);
  const title = str(attrs.title);
  return (
    `${styles}<a class="cp" href="${attr(str(attrs.href))}" data-kind="${attr(str(attrs.kind))}"${title ? ` title="${attr(title)}"` : ""}>` +
    `${src ? `<img class="cp-img" src="${attr(src)}" alt="">` : ""}${(await Promise.all(children.map((child) => state.one(child, state, node)))).join("")}</a>`
  );
};

/** The HTML renderer for chips. Pass it as `components`; it inlines the styles once per document. */
export const components: Record<typeof CHIP_TAG, NodeHandler> = { [CHIP_TAG]: chip };
