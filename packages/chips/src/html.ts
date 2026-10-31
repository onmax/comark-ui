import type { NodeHandler } from "comark";
import { CHIP_TAG } from "./index.ts";
import { css } from "./styles.ts";
import { rawText } from "../../../shared/text.ts";
import { attr } from "../../../shared/html.ts";

export { CHIP_TAG, default } from "./index.ts";
export type { ChipsMeta, ChipsOptions } from "./index.ts";
export { css };

// Each render gets a fresh `state.context`, so a document carries the styles once.
const styled = new WeakSet<object>();

const chip: NodeHandler = async (node, state) => {
  const [, attrs, ...children] = node;
  const styles = styled.has(state.context) ? "" : `<style data-comark-chips>${css}</style>`;
  styled.add(state.context);
  const src = rawText(attrs.src);
  const title = rawText(attrs.title);
  return (
    `${styles}<a class="cp" href="${attr(rawText(attrs.href))}" data-kind="${attr(rawText(attrs.kind))}"${title ? ` title="${attr(title)}"` : ""}>` +
    `${src ? `<img class="cp-img" src="${attr(src)}" alt="">` : ""}${(await Promise.all(children.map((child) => state.one(child, state, node)))).join("")}</a>`
  );
};

/** The HTML renderer for chips. Pass it as `components`; it inlines the styles once per document. */
export const components: Record<typeof CHIP_TAG, NodeHandler> = { [CHIP_TAG]: chip };
