import type { NodeHandler, State } from "comark";
import { escapeHtml } from "comark/utils";
import { readDiff } from "./read.ts";
import { css } from "./styles.ts";
import { attr } from "../../../shared/html.ts";

export { default } from "./index.ts";
export type { DiffMeta } from "./index.ts";

// Each render gets a fresh `state.context`, so a document carries the styles once.
const styled = new WeakSet<object>();
function styles(state: State) {
  if (styled.has(state.context)) return "";
  styled.add(state.context);
  return `<style data-comark-diff>${css}</style>`;
}

// Comark restores shared render state after each node, so rows render one at a time to keep the output deterministic.
async function each<T>(items: T[], render: (item: T) => Promise<string>) {
  let html = "";
  for (const item of items) html += await render(item);
  return html;
}

// Lucide's file-diff (ISC).
const FILE_DIFF = `<svg class="cd-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M9 10h6"/><path d="M12 13V7"/><path d="M9 17h6"/></svg>`;

// A table, so the line numbers stay beside their lines however long the code is. The numbers and the + and − come
// from CSS, so a copied selection holds only the code. The table keeps the first block's Shiki class for the token
// colors. Each line renders as a paragraph's children, which the renderer keeps on one line, where a cell would indent
// its `ins` and `del`. The header uses spans, since a host's rules for `code` and `strong` would beat the plugin's.
const diff: NodeHandler = async (node, state) => {
  const { file, label, line, rows, code } = readDiff(node, [], state.renderData);
  const count = (kind: string) => rows.filter((row) => row.kind === kind).length;
  const number = (value?: number) =>
    `<td class="cd-num"${value === undefined ? "" : ` data-line="${value}"`}></td>`;
  const body = await each(
    rows,
    async (row) =>
      `<tr class="cd-${row.kind}"${row.highlight ? " data-highlight" : ""}>${line === undefined ? "" : number(row.old) + number(row.new)}<td class="cd-line">${await state.flow(["p", {}, ...row.nodes], state)}</td></tr>`,
  );
  const header = [
    FILE_DIFF,
    label && `<span class="cd-label">${escapeHtml(label)}</span>`,
    file && `<span class="cd-file">${escapeHtml(file)}</span>`,
    `<span class="cd-counts"><span class="cd-added">+${count("add")}</span> <span class="cd-removed">−${count("del")}</span></span>`,
  ]
    .filter(Boolean)
    .join("");
  const classes = ["cd-code", code.class].filter(Boolean).join(" ");
  return (
    `${styles(state)}<figure class="cd"><figcaption>${header}</figcaption>` +
    `<div class="cd-scroll" tabindex="0"><table class="${attr(classes)}"${code.style ? ` style="${attr(code.style)}"` : ""}><tbody>${body}</tbody></table></div></figure>`
  );
};

/** The HTML renderer for `::diff`. Pass it as `components`; it inlines the styles once per document. */
export const components: Record<"diff", NodeHandler> = { diff };
