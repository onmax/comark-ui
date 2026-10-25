import type { NodeHandler } from "comark";
import { escapeHtml } from "comark/utils";
import { css } from "./styles.ts";

export { colors, default } from "./index.ts";
export type { BadgeAttributes, BadgeColor, BadgeMeta, BadgeOptions } from "./index.ts";

// Each render gets a fresh `state.context`, so a document carries the styles once.
const styled = new WeakSet<object>();

const badge: NodeHandler = async (node, state) => {
  const styles = styled.has(state.context) ? "" : `<style data-comark-badge>${css}</style>`;
  styled.add(state.context);
  // SAFETY: the parse plugin writes image attributes as strings, or omits them for prose badges.
  const { src, label } = node[1] as { src?: string; label?: string };
  if (src) {
    const attr = (value: string) => escapeHtml(value, { '"': "&quot;" });
    return `${styles}<img class="cb-image" src="${attr(src)}" alt="${attr(label ?? "Badge")}" height="26">`;
  }
  // SAFETY: the parse plugin writes `color` as a string.
  const color = escapeHtml(String((node[1].color as string | undefined) ?? "primary"), {
    '"': "&quot;",
  });
  return `${styles}<span class="cb" data-color="${color}">${await state.flow(node, state)}</span>`;
};

/** The HTML renderer for `:badge`. Pass it as `components`; it inlines the styles once per document. */
export const components: Record<"badge", NodeHandler> = { badge };
