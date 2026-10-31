import type { NodeHandler, State } from "comark";
import type { IconData } from "comark-icon";
import { iconHtml, iconStyles } from "comark-icon/html";
import { css } from "./styles.ts";
import { attr } from "../../../shared/html.ts";

export { default } from "./index.ts";
export type {
  DetailsMeta,
  DetailsOptions,
  DisclosureAttributes,
  DisclosureSummaryAttributes,
} from "./index.ts";

// Each render gets a fresh `state.context`, so a document carries the styles once.
const styled = new WeakSet<object>();

const styles = (state: State) => {
  if (styled.has(state.context)) return "";
  styled.add(state.context);
  return `<style data-comark-details>${css}</style>`;
};

const accordion: NodeHandler = async (node, state) =>
  `${styles(state)}<div class="cdt-accordion">${await state.flow(node, state)}</div>`;

const disclosure: NodeHandler = async (node, state) => {
  const [, attrs, head] = node;
  // The icon styles come before the block, where a `<style>` may sit.
  const icons = Array.isArray(head) && head[1]?.icon ? iconStyles(state) : "";
  return (
    `${styles(state)}${icons}<details class="cdt" data-variant="${attr(attrs.variant)}"${attrs.name ? ` name="${attr(attrs.name)}"` : ""}${attrs.open ? " open" : ""}>` +
    `${await state.flow(node, state)}</details>`
  );
};

const summary: NodeHandler = async (node, state) => {
  const [, attrs] = node;
  // SAFETY: the parse plugin writes `icon` as comark-icon's `IconData`.
  const icon = attrs.icon ? iconHtml(attrs.icon as IconData) : "";
  const toggle = attrs.show
    ? `<span class="cdt-toggle" data-show="${attr(attrs.show)} " data-hide="${attr(attrs.hide)} "></span>`
    : "";
  return `<summary class="cdt-summary">${icon}<span>${toggle}${await state.flow(node, state)}</span></summary>`;
};

/** The HTML renderer for `::details`, `::accordion`, and `::collapsible`. Pass it as `components`. */
export const components: Record<"accordion" | "disclosure" | "disclosure-summary", NodeHandler> = {
  accordion,
  disclosure,
  "disclosure-summary": summary,
};
