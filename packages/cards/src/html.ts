import type { NodeHandler, State } from "comark";
import { escapeHtml } from "comark/utils";
import type { IconData } from "comark-icon";
import { iconHtml, iconStyles } from "comark-icon/html";
import { external, rel } from "./client.ts";
import { css } from "./styles.ts";

export { colors, default, variants } from "./index.ts";
export type {
  CardAttributes,
  CardColor,
  CardVariant,
  CardsMeta,
  CardsOptions,
  ColumnsAttributes,
} from "./index.ts";

// Each render gets a fresh `state.context`, so a document carries the styles once.
const styled = new WeakSet<object>();

const attr = (value: unknown) =>
  escapeHtml(
    // SAFETY: the parse plugin writes every attribute the renderer reads as a string.
    String(value as string),
    { '"': "&quot;" },
  );
const styles = (state: State) => {
  if (styled.has(state.context)) return "";
  styled.add(state.context);
  return `<style data-comark-cards>${css}</style>`;
};

const card: NodeHandler = async (node, state) => {
  const [, attrs] = node;
  // SAFETY: the parse plugin writes `target` as a string.
  const target = attrs.target ? (attrs.target as string) : undefined;
  const link = attrs.to
    ? `<a class="ccr-link" href="${attr(attrs.to)}"${target ? ` target="${attr(target)}"` : ""}${rel(target) ? ` rel="${rel(target)}"` : ""} aria-label="${attr(attrs.label)}"></a>`
    : "";
  // SAFETY: the parse plugin writes `icon` as comark-icon's `IconData`.
  const icon = attrs.icon ? iconHtml(attrs.icon as IconData) : "";
  const arrow = attrs.external
    ? `<svg class="ccr-external" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${external}"></path></svg>`
    : "";
  return (
    `${styles(state)}${attrs.icon ? iconStyles(state) : ""}<div class="ccr" data-color="${attr(attrs.color ?? "primary")}"${attrs.variant ? ` data-variant="${attr(attrs.variant)}"` : ""}>` +
    `${link}${icon}${arrow}${await state.flow(node, state)}</div>`
  );
};

const title: NodeHandler = async (node, state) =>
  `<p class="ccr-title">${await state.flow(node, state)}</p>`;

const group: NodeHandler = async (node, state) =>
  `${styles(state)}<div class="ccr-group">${await state.flow(node, state)}</div>`;

const columns: NodeHandler = async (node, state) =>
  `${styles(state)}<div class="ccr-columns" data-cols="${attr(node[1].cols ?? "2")}">${await state.flow(node, state)}</div>`;

const column: NodeHandler = async (node, state) =>
  `<div class="ccr-column">${await state.flow(node, state)}</div>`;

/** The HTML renderer for `::card-group`, `::card`, and `::columns`. Pass it as `components`. */
export const components: Record<
  "card" | "card-title" | "card-group" | "columns" | "column",
  NodeHandler
> = {
  card,
  "card-title": title,
  "card-group": group,
  columns,
  column,
};
