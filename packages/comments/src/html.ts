import type { NodeHandler, State } from "comark";
import { escapeHtml } from "comark/utils";
import { type Entry, hash, ROOT } from "./read.ts";
import { css, fontCss } from "./styles.ts";

export { default } from "./index.ts";
export type { CommentsMeta, CommentsOptions, Entry, Mark } from "./index.ts";

// Each render gets a fresh `state.context`, so a document carries the styles, and the font, once.
const styled = new WeakSet<object>();
const fonted = new WeakSet<object>();
function once(set: WeakSet<object>, state: State, html: string) {
  if (set.has(state.context)) return "";
  set.add(state.context);
  return html;
}
const styles = (state: State) => once(styled, state, `<style data-comark-comments>${css}</style>`);

const attr = (value: string) => escapeHtml(value, { '"': "&quot;" });
// SAFETY: the parse plugin writes every attribute the renderer reads as a string, and `thread` as entries.
const read = (state: Record<string, unknown>, key: string) => state[key] as string | undefined;

const STROKES = [
  "M1 6.5C24 4.8 61 6.9 99 3.9",
  "M2 4.6C30 6.4 66 3.6 98 5.8",
  "M1 5.9C33 3.8 70 6.6 99 4.4",
];
const CARET =
  '<span class="cr-caret" aria-hidden="true"><svg viewBox="0 0 10 8"><path d="M1 7.4L5.2 1.2 9.1 7"/></svg></span>';
// Avatars are an initial on a color from the name, so nothing is downloaded.
const COLORS = [
  "#d97757",
  "#2563eb",
  "#7c3aed",
  "#059669",
  "#db2777",
  "#0891b2",
  "#ca8a04",
  "#4f46e5",
];

function who(by: string) {
  const name = by.replace(/^@/, "");
  if (!name) return "";
  const initial = [...new Intl.Segmenter().segment(name)][0]?.segment.toUpperCase() ?? "";
  const color = COLORS[Number.parseInt(hash(name.toLowerCase()), 36) % COLORS.length];
  return `<span class="cr-av" style="--cr-av:${color}" aria-hidden="true">${escapeHtml(initial)}</span><b>${escapeHtml(name)}</b>`;
}

// The anchor, then a word joiner so nothing breaks before the bubble, the hidden toggle, the bubble, and the card.
function thread(attrs: Record<string, unknown>) {
  const uid = read(attrs, "uid");
  if (!uid) return "";
  // SAFETY: the parse plugin writes `thread` as the card's entries whenever it writes `uid`.
  const entries = attrs.thread as Entry[];
  const card = entries
    .map((entry) => `<span class="cr-entry">${who(entry.by)}${escapeHtml(entry.note)}</span>`)
    .join("");
  return (
    `&#8288;<input class="cr-tg" type="checkbox" id="${attr(uid)}" aria-label="${attr(read(attrs, "label") ?? "")}">` +
    `<label class="cr-bub" for="${attr(uid)}">${entries.length > 1 ? entries.length : ""}</label>` +
    `<span class="cr-card" role="note">${card}</span>`
  );
}

const id = (attrs: Record<string, unknown>) => {
  const value = read(attrs, "id");
  return value ? ` id="${attr(value)}"` : "";
};

const suggestion: NodeHandler = async (node, state) => {
  const attrs = node[1];
  if (attrs.plain) return state.flow(node, state);
  const from = read(attrs, "from") ?? "";
  const body = node.length > 2 ? await state.flow(node, state) : "";
  const pen = attrs.mark === "pen";
  const kind = from && body ? "replace" : from ? "delete" : "insert";
  const stroke = STROKES[Number(read(attrs, "stroke") ?? 0) % STROKES.length];
  const del = from
    ? `<del>${escapeHtml(from)}${pen ? `<svg class="cr-strike" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true"><path d="${stroke}"/></svg>` : ""}</del>`
    : "";
  const ins = body ? `${pen && !from ? CARET : ""}<ins>${body}</ins>` : "";
  const mark = `<span class="cr-sg" data-mark="${pen ? "pen" : "track"}" data-kind="${kind}"${id(attrs)}>${del}${ins}</span>`;
  const tail = thread(attrs);
  return (
    styles(state) +
    (pen ? once(fonted, state, `<style data-comark-comments-font>${fontCss}</style>`) : "") +
    // A pen mark is an inline block, and Chrome may break a line after one even before a word joiner, so the mark and
    // its bubble sit in one span that doesn't wrap. A pen change is short, so it never needs to.
    (pen && tail ? `<span class="cr-keep">${mark}${tail}</span>` : mark + tail)
  );
};

const comment: NodeHandler = async (node, state) => {
  const attrs = node[1];
  if (attrs.plain) return state.flow(node, state);
  return `${styles(state)}<mark class="cr-cm"${id(attrs)}>${await state.flow(node, state)}</mark>${thread(attrs)}`;
};

// The root is the container the cards measure against, so the margin opens only when the document is wide enough.
const root: NodeHandler = async (node, state) =>
  `${styles(state)}<div class="cr">${await state.flow(node, state)}</div>`;

/**
 * The HTML renderer for `:suggestion` and `:comment`. Pass it as `components`; it inlines the styles once per
 * document, and the handwriting font only when a suggestion draws with `pen`.
 */
export const components: Record<"suggestion" | "comment" | typeof ROOT, NodeHandler> = {
  suggestion,
  comment,
  [ROOT]: root,
};
