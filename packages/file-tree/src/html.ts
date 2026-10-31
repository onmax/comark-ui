import type { Node, NodeHandler } from "comark";
import { escapeHtml } from "comark/utils";
import type { IconData } from "comark-icon";
import { iconHtml, iconStyles } from "comark-icon/html";
import { glyphs, marks } from "./client.ts";
import { css } from "./styles.ts";
import { rawText } from "../../../shared/text.ts";

export { default } from "./index.ts";
export type { EntryState, FileTreeItemAttributes, FileTreeMeta, FileTreeOptions } from "./index.ts";

// Each render gets a fresh `state.context`, so a document carries the styles once.
const styled = new WeakSet<object>();

const text = (value: unknown) => escapeHtml(rawText(value));
const glyph = (d: string) =>
  `<svg class="cft-glyph" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"></path></svg>`;

const hasIcon = (node: Node): boolean =>
  Array.isArray(node) &&
  // SAFETY: an element node is [tag, attributes, ...children], so everything after index 1 is a child node.
  (Boolean(node[1]?.icon) || (node.slice(2) as Node[]).some(hasIcon));

const fileTree: NodeHandler = async (node, state) => {
  const styles = styled.has(state.context) ? "" : `<style data-comark-file-tree>${css}</style>`;
  styled.add(state.context);
  // The icon styles come before the tree, where a `<style>` may sit.
  const icons = hasIcon(node) ? iconStyles(state) : "";
  return `${styles}${icons}<div class="cft"><ul>${await state.flow(node, state)}</ul></div>`;
};

const item: NodeHandler = async (node, state) => {
  const [, attrs] = node;
  if (attrs.type === "more") return '<li data-type="more">…</li>';
  const folder = attrs.type === "folder";
  const mark = marks.get(String(attrs.state));
  const icon = attrs.icon
    ? // SAFETY: the parse plugin writes `icon` as comark-icon's `IconData`.
      iconHtml(attrs.icon as IconData)
    : glyph(folder ? glyphs.folder : glyphs.file);
  const entry =
    `<span class="cft-entry">${icon}${mark ? `<span class="cft-mark">${mark}</span>` : ""}` +
    `<span class="cft-name">${text(attrs.name)}</span>${attrs.note ? `<span class="cft-note">${text(attrs.note)}</span>` : ""}</span>`;
  const open = `<li data-type="${folder ? "folder" : "file"}"${mark ? ` data-state="${text(attrs.state)}"` : ""}>`;
  return folder
    ? `${open}<details open><summary>${entry}</summary><ul>${await state.flow(node, state)}</ul></details></li>`
    : `${open}${entry}</li>`;
};

/** The HTML renderer for `::file-tree`. Pass it as `components`; it inlines the styles once per document. */
export const components: Record<"file-tree" | "file-tree-item", NodeHandler> = {
  "file-tree": fileTree,
  "file-tree-item": item,
};
