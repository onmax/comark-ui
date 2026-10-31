import type { ElementNode, NodeHandler, State } from "comark";
import { resolveAttributes } from "comark/render";
import { escapeHtml } from "comark/utils";
import {
  childrenOf,
  DEFERRED,
  type DeferredMetadata,
  type Entry,
  hash,
  isElement,
  nativeAttributes,
  ROOT,
  transform,
  wrapParagraphs,
} from "./read.ts";
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
const valueOf = (value: unknown): string =>
  value === undefined || value === null
    ? ""
    : value instanceof Object
      ? JSON.stringify(value)
      : // SAFETY: objects and nullish values returned above; native scalar attributes stringify as in Comark.
        String(value as string | number | boolean);
const classOf = (name: string, attrs: Record<string, unknown>) =>
  attr([name, valueOf(attrs.class)].filter(Boolean).join(" "));
const attributes = (attrs: Record<string, unknown>, omit: readonly string[] = []) =>
  Object.entries(nativeAttributes(attrs))
    .filter(
      ([key, value]) =>
        /^[a-zA-Z_][a-zA-Z0-9:._-]*$/.test(key) &&
        !omit.includes(key.toLowerCase()) &&
        value !== undefined &&
        value !== null,
    )
    .map(([key, value]) => ` ${key}="${attr(valueOf(value))}"`)
    .join("");
// SAFETY: the parse plugin writes every attribute the renderer reads as a string, and `thread` as entries.
const read = (state: Record<string, unknown>, key: string) => state[key] as string | undefined;

// Parsed documents can be rendered repeatedly, and independent fragments can share a page.
const namespaces = new WeakMap<object, string>();
function idFor(uid: string, state: State) {
  let namespace = namespaces.get(state.context);
  if (!namespace) {
    namespace = Array.from(crypto.getRandomValues(new Uint32Array(4)), (part) =>
      part.toString(16).padStart(8, "0"),
    ).join("");
    namespaces.set(state.context, namespace);
  }
  return `${uid}-${namespace}`;
}

const STROKES = [
  "M1 6.5C24 4.8 61 6.9 99 3.9",
  "M2 4.6C30 6.4 66 3.6 98 5.8",
  "M1 5.9C33 3.8 70 6.6 99 4.4",
];
const CARET =
  '<span class="cr-caret" aria-hidden="true"><svg viewBox="0 0 10 8"><path d="M1 7.4L5.2 1.2 9.1 7"/></svg></span>';
// Without an image from `avatars`, an avatar is an initial on a tint from the name, so nothing is downloaded. The hues
// skip blue-violet, and the styles mix each one into the page's own colors so it reads in light and dark.
const HUES = [25, 55, 85, 145, 175, 205, 235, 345];

function who(by: string, avatar?: string) {
  const name = by.replace(/^@/, "");
  if (!name) return "";
  if (avatar)
    return `<img class="cr-av" src="${attr(avatar)}" alt="" width="18" height="18"><b>${escapeHtml(name)}</b>`;
  const initial = [...new Intl.Segmenter().segment(name)][0]?.segment.toUpperCase() ?? "";
  const hue = HUES[Number.parseInt(hash(name.toLowerCase()), 36) % HUES.length];
  return `<span class="cr-av" style="--cr-hue:${hue}" aria-hidden="true">${escapeHtml(initial)}</span><b>${escapeHtml(name)}</b>`;
}

// The anchor, then a word joiner so nothing breaks before the bubble, the hidden toggle, the bubble, and the card.
function thread(attrs: Record<string, unknown>, state: State) {
  const base = read(attrs, "uid");
  if (!base) return "";
  const uid = idFor(base, state);
  // SAFETY: the parse plugin writes `thread` as the card's entries whenever it writes `uid`.
  const entries = attrs.thread as Entry[];
  const card = entries
    .map(
      (entry) =>
        `<span class="cr-entry">${who(entry.by, entry.avatar)}${escapeHtml(entry.note)}</span>`,
    )
    .join("");
  return (
    `&#8288;<input class="cr-tg" type="checkbox" id="${attr(uid)}" aria-label="${attr(read(attrs, "label") ?? "")}">` +
    `<label class="cr-bub" for="${attr(uid)}">${entries.length > 1 ? entries.length : ""}</label>` +
    `<span class="cr-card" role="note">${card}</span>`
  );
}

const plain: NodeHandler = async (node, state) => {
  const body = await state.flow(node, state);
  const native = attributes(node[1]);
  return native ? `<span${native}>${body}</span>` : body;
};

const suggestion: NodeHandler = async (node, state) => {
  const attrs = node[1];
  if (attrs.plain) return plain(node, state);
  const from = read(attrs, "from") ?? "";
  const body = node.length > 2 ? await state.flow(node, state) : "";
  const pen = attrs.mark === "pen";
  const kind = from && body ? "replace" : from ? "delete" : "insert";
  const stroke = STROKES[Number(read(attrs, "stroke") ?? 0) % STROKES.length];
  const del = from
    ? `<del>${escapeHtml(from)}${pen ? `<svg class="cr-strike" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true"><path d="${stroke}"/></svg>` : ""}</del>`
    : "";
  const ins = body ? `${pen && !from ? CARET : ""}<ins>${body}</ins>` : "";
  const mark = `<span class="${classOf("cr-sg", attrs)}" data-mark="${pen ? "pen" : "track"}" data-kind="${kind}"${attributes(attrs, ["class", "data-mark", "data-kind"])}>${del}${ins}</span>`;
  const tail = thread(attrs, state);
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
  if (attrs.plain) return plain(node, state);
  return `${styles(state)}<mark class="${classOf("cr-cm", attrs)}"${attributes(attrs, ["class"])}>${await state.flow(node, state)}</mark>${thread(attrs, state)}`;
};

// The root is the container the cards measure against, so the margin opens only when the document is wide enough.
const root: NodeHandler = async (node, state) =>
  `${styles(state)}<div class="cr">${await state.flow(node, state)}</div>`;

const deferred: NodeHandler = async (node, state) => {
  // SAFETY: only the parse plugin emits this wrapper and its settings in the reserved metadata.
  const { comments: settings } = node[1].$ as DeferredMetadata;
  // Normalization moves replies and replaces attributes, so each render needs its own copy.
  const nodes = structuredClone(childrenOf(node));
  wrapParagraphs(nodes);
  const rendered = new WeakMap<ElementNode, Record<string, unknown>>();
  const fragments: { node: ElementNode; body: string; reply: boolean }[] = [];
  const marker = `\uE000${idFor("comments", state)}:`;
  const slots = new RegExp(`${marker}(\\d+)\uE001`, "g");
  const isReply = (child: ElementNode) =>
    child[0] === "comment" &&
    (Object.hasOwn(child[1], "reply") || Object.hasOwn(child[1], ":reply"));
  const emptyReplyParagraph = (element: ElementNode) => {
    const children = childrenOf(element);
    return (
      element[0] === "p" &&
      children.some((child) => isElement(child) && isReply(child)) &&
      children.every((child) =>
        !Array.isArray(child)
          ? !child.trim()
          : isElement(child) &&
            isReply(child) &&
            childrenOf(child).every((text) => !Array.isArray(text) && !text.trim()),
      )
    );
  };
  const one = state.one;
  const flow = state.flow;
  // Comark's default flow closes over its own one(), so route it through the scoped interceptor too.
  state.flow = async (element, current, parent) => {
    let html = "";
    for (const child of childrenOf(element))
      html += await current.one(child, current, parent ?? element);
    return html;
  };
  // Capture each annotation where its parent actually renders it. Component handlers may establish props
  // immediately before flow(), and must run only once. Slots let later replies join earlier cards.
  state.one = async (child, current, parent, atLineStart) => {
    if (isElement(child) && (child[0] === "comment" || child[0] === "suggestion")) {
      const previous = current.renderData;
      const attrs = resolveAttributes(child[1], previous, { parseJson: true });
      rendered.set(child, attrs);
      if (Object.keys(child[1]).some((key) => key !== "$"))
        current.renderData = { ...previous, props: attrs };
      let body: string;
      try {
        body = await current.flow(child, current);
      } finally {
        current.renderData = previous;
      }
      const slot = fragments.length;
      fragments.push({ node: child, body, reply: isReply(child) });
      return `${marker}${slot}\uE001`;
    }
    const html = await one(child, current, parent, atLineStart);
    return isElement(child) && emptyReplyParagraph(child) ? "" : html;
  };
  let html: string;
  try {
    html = await state.render(nodes);
  } finally {
    state.one = one;
    state.flow = flow;
  }
  transform(nodes, { ...settings, data: state.renderData, rendered });
  const margin = isElement(nodes[0]) && nodes[0][0] === ROOT;
  const leading = margin ? styles(state) : "";
  const replacements: string[] = [];
  const fill = (value: string) =>
    value.replace(slots, (_, index: string) => replacements[Number(index)]!);
  // Children are captured before their parents, so their slots are already filled here.
  for (const fragment of fragments) {
    const body = fill(fragment.body);
    const handler = fragment.node[0] === "suggestion" ? suggestion : comment;
    replacements.push(
      fragment.reply ? body : await handler(fragment.node, { ...state, flow: async () => body }),
    );
  }
  html = fill(html);
  return margin ? `${leading}<div class="cr">${html}</div>` : html;
};

/**
 * The HTML renderer for `:suggestion` and `:comment`. Pass it as `components`; it inlines the styles once per
 * document, and the handwriting font only when a suggestion draws with `pen`.
 */
export const components: Record<
  "suggestion" | "comment" | typeof ROOT | typeof DEFERRED,
  NodeHandler
> = {
  suggestion,
  comment,
  [ROOT]: root,
  [DEFERRED]: deferred,
};
