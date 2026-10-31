import type { ElementNode, Node, NodeHandler, State } from "comark";
import { escapeHtml } from "comark/utils";
import { start } from "./client.ts";
import type { IconData } from "comark-icon";
import { iconHtml, iconStyles } from "comark-icon/html";
import { css } from "./styles.ts";
import { attr } from "../../../shared/html.ts";

export { default } from "./index.ts";
export type { PackageManager, TabsMeta, TabsOptions } from "./index.ts";

// Each render gets a fresh `state.context`, so a document carries the script once.
const started = new WeakSet<object>();

/** The tabs script as one inline `<script>`, once per render. */
export function runtime(state: State): string {
  if (started.has(state.context)) return "";
  started.add(state.context);
  // The styles come inline before the script, so the script has nothing to add.
  return `<style data-comark-tabs>${css}</style><script>(${start.toString()})("")</script>`;
}

const isItem = (node: Node): node is ElementNode => Array.isArray(node) && node[0] === "tabs-item";

// SAFETY: the parse plugin writes each icon as comark-icon's `IconData`, or null for a tab without one.
const iconOf = (icon: unknown) => (icon ? iconHtml(icon as IconData) : "");

function tabHtml(id: string, label: string, index: number, icon: unknown) {
  return `<button type="button" class="ct-tab" role="tab" id="${id}-tab-${index}" aria-controls="${id}-panel-${index}" aria-selected="${index === 1}" tabindex="${index === 1 ? 0 : -1}">${iconOf(icon)}${escapeHtml(label)}</button>`;
}

const tabs: NodeHandler = async ([, attrs, ...children], state) => {
  const id = attr(attrs.uid);
  const labels = Array.isArray(attrs.labels) ? attrs.labels.map(String) : [];
  const icons: unknown[] = Array.isArray(attrs.icons) ? attrs.icons : [];
  const panels = await Promise.all(
    children.filter(isItem).map(async ([, item, ...content]) => {
      const index = Number(item.index) || 1;
      return (
        `<div class="ct-panel" role="tabpanel" id="${id}-panel-${index}" aria-labelledby="${id}-tab-${index}" tabindex="0"${index > 1 ? " data-inactive" : ""}>` +
        `<div class="ct-caption">${iconOf(item.icon)}${escapeHtml(labels[index - 1] ?? "")}</div>${await state.flow(["div", {}, ...content], state)}</div>`
      );
    }),
  );
  return (
    `<div class="ct"${attrs.code ? " data-tabs-code" : ""}${attrs.sync ? ` data-tabs-sync="${attr(attrs.sync)}"` : ""}>` +
    `<div class="ct-list" role="tablist">${labels.map((label, at) => tabHtml(id, label, at + 1, icons[at])).join("")}</div>` +
    `${panels.join("")}</div>${runtime(state)}${icons.some(Boolean) ? iconStyles(state) : ""}`
  );
};

/** The HTML renderer for `::tabs` and `::code-group`. Pass it as `components`. */
export const components: Record<"tabs", NodeHandler> = { tabs };
