import { defineComarkPlugin } from "comark";
import {
  addRule,
  renameTokens,
  SPAN,
  type MarkdownExit,
  type StateInline,
} from "../../../shared/markdown-it.ts";

// Ported from markdown-it-mark and markdown-it-sup (MIT, Vitaly Puzrin and Alex Kocharin), which ship no types.
// Comark has no `mark_open` in its table, so marks are renamed to its generic span; it already builds `sup_open`.

const EQUALS = 0x3d;
const CARET = 0x5e;
const BRACKET = 0x5b;

/** Pushes each `==` as a text token and a delimiter, which `pairMarks` turns into tags once the line is read. */
function mark(state: StateInline, silent: boolean) {
  if (silent || state.src.charCodeAt(state.pos) !== EQUALS) return false;
  const scanned = state.scanDelims(state.pos, true);
  let length = scanned.length;
  if (length < 2) return false;
  if (length % 2) {
    state.push("text", "", 0).content = "=";
    length--;
  }
  for (let i = 0; i < length; i += 2) {
    state.push("text", "", 0).content = "==";
    if (!scanned.can_open && !scanned.can_close) continue;
    state.delimiters.push({
      marker: EQUALS,
      // Not emphasis's rule of 3.
      length: 0,
      token: state.tokens.length - 1,
      end: -1,
      open: scanned.can_open,
      close: scanned.can_close,
    });
  }
  state.pos += scanned.length;
  return true;
}

function pairMarks(state: StateInline, delimiters: StateInline["delimiters"]) {
  const lone: number[] = [];
  for (const start of delimiters) {
    if (start.marker !== EQUALS || start.end === -1) continue;
    const end = delimiters[start.end];
    const open = end && state.tokens[start.token];
    const close = end && state.tokens[end.token];
    if (!end || !open || !close) continue;
    Object.assign(open, { type: "mark_open", tag: "mark", nesting: 1, markup: "==", content: "" });
    Object.assign(close, {
      type: "mark_close",
      tag: "mark",
      nesting: -1,
      markup: "==",
      content: "",
    });
    const before = state.tokens[end.token - 1];
    if (before?.type === "text" && before.content === "=") lone.push(end.token - 1);
  }
  // An odd run such as `=====` splits into `=`, `==`, `==`; its lone `=` moves after the closing tags.
  for (let i = lone.pop(); i !== undefined; i = lone.pop()) {
    let j = i + 1;
    while (state.tokens[j]?.type === "mark_close") j++;
    j--;
    const [a, b] = [state.tokens[i], state.tokens[j]];
    if (i !== j && a && b) [state.tokens[i], state.tokens[j]] = [b, a];
  }
}

function pairAll(state: StateInline) {
  pairMarks(state, state.delimiters);
  for (const meta of state.tokens_meta) if (meta?.delimiters) pairMarks(state, meta.delimiters);
  renameTokens(state.tokens, { mark: SPAN });
}

function restoreUnresolvedFootnoteRefs(state: {
  tree: { nodes: unknown[] };
  footnote?: Map<string, unknown>;
}) {
  const definitions = state.footnote;
  const rewrite = (value: unknown): unknown => {
    if (!Array.isArray(value)) return value;
    if (
      value[0] === "span" &&
      value.length === 3 &&
      /^\^[^\s\]^]+$/.test(String(value[2])) &&
      (!definitions || !definitions.has(String(value[2]).slice(1)))
    )
      return `[${String(value[2])}]`;
    return value.map(rewrite);
  };
  state.tree.nodes = state.tree.nodes.map(rewrite);
}

// The same as markdown's escapable characters, plus a space.
const UNESCAPE = /\\([ \\!"#$%&'()*+,./:;<=>?@[\]^_`{|}~-])/g;

function superscript(state: StateInline, silent: boolean) {
  const max = state.posMax;
  const start = state.pos;
  if (state.src.charCodeAt(start) !== CARET || silent || start + 2 >= max) return false;
  // `[^1]` is a footnote reference, here or in a footnotes plugin, not the start of a superscript.
  // The link/reference rule may consume `[` before this rule runs, so inspect the
  // pending text and most recently emitted token as well as the raw source.
  const previous = state.tokens[state.tokens.length - 1];
  // SAFETY: Comark's inline state exposes the pending text at runtime but omits it from its type.
  const pending = (state as StateInline & { pending?: string }).pending;
  if (
    state.src.charCodeAt(start - 1) === BRACKET ||
    pending?.endsWith("[") ||
    (previous?.type === "text" && previous.content.endsWith("["))
  )
    return false;
  state.pos = start + 1;
  let found = false;
  while (state.pos < max) {
    if (state.src.charCodeAt(state.pos) === CARET) {
      found = true;
      break;
    }
    state.md.inline.skipToken(state);
  }
  const content = state.src.slice(start + 1, state.pos);
  // No unescaped whitespace inside.
  if (!found || !content || /(^|[^\\])(\\\\)*\s/.test(content)) {
    state.pos = start;
    return false;
  }
  state.push("sup_open", "sup", 1).markup = "^";
  state.push("text", "", 0).content = content.replace(UNESCAPE, "$1");
  state.push("sup_close", "sup", -1).markup = "^";
  state.pos += 1;
  state.posMax = max;
  return true;
}

// At module level, so every parse reuses Comark's cached parser.
const markdownIt = (md: MarkdownExit) => {
  addRule(md.inline.ruler, "before", ["emphasis"], "mark", mark);
  addRule(md.inline.ruler2, "before", ["emphasis"], "mark", pairAll);
  addRule(md.inline.ruler, "after", ["emphasis"], "sup", superscript);
};

/** `==highlighted text==` as `<mark>`, and `^superscript^` as `<sup>`. */
export default defineComarkPlugin(() => ({
  name: "comark-mark",
  markdownItPlugins: [markdownIt],
  post: restoreUnresolvedFootnoteRefs,
}));
