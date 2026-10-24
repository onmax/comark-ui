import { defineComarkPlugin } from "comark";
import {
  addRule,
  SPAN,
  stable,
  type MarkdownExit,
  type StateInline,
} from "../../../shared/markdown-it.ts";
import { aliases, names } from "./keys.ts";

export interface KeysOptions {
  /** What sits between two keys. Default `"+"`; `""` puts none. */
  separator?: string;
  /** More keys, or other names for the built-in ones, by lowercase name: `{ hyper: "Hyper", control: "Control" }`. */
  keys?: Record<string, string>;
}

type Key = { name: string; label: string } | { name?: undefined; label: string };

const PLUS = 0x2b;
// A letter, digit, `_`, or `-`, the characters of a key's name in pymdownx.keys.
const NAME = /[\p{L}\p{N}_-]/u;
// Before the opening `++`: a word, as in `C++`, another `+`, or the `{` of comark-critic's `{++insertion++}`.
const GLUED = /[\p{L}\p{N}_+{]/u;

/** Reads the quoted key at `start`, or undefined if its quote never closes or it holds only spaces. */
function quoted(
  src: string,
  start: number,
  max: number,
): { label: string; end: number } | undefined {
  const quote = src[start];
  let label = "";
  for (let pos = start + 1; pos < max; pos++) {
    const char = src[pos];
    if (char === "\\" && pos + 1 < max) label += src[++pos];
    else if (char === quote)
      return label.trim() ? { label: label.trim(), end: pos + 1 } : undefined;
    else label += char;
  }
}

/** Reads `++key+key++` at the state's position into its keys, or undefined if it isn't one. */
function read(state: StateInline, table: Record<string, string>) {
  const { src, posMax: max } = state;
  const start = state.pos;
  if (src.charCodeAt(start) !== PLUS || src.charCodeAt(start + 1) !== PLUS) return;
  if (start > 0 && GLUED.test(src[start - 1] ?? "")) return;
  const keys: Key[] = [];
  let pos = start + 2;
  for (;;) {
    const char = src[pos];
    if (char === '"' || char === "'") {
      const key = quoted(src, pos, max);
      if (!key) return;
      keys.push({ label: key.label });
      pos = key.end;
    } else {
      let end = pos;
      while (end < max && NAME.test(src[end] ?? "")) end++;
      if (end === pos) return;
      const written = src.slice(pos, end).toLowerCase();
      const name = aliases.get(written) ?? written;
      // Only configured names are keys; inherited object properties are unknown.
      if (!Object.hasOwn(table, name)) return;
      const label = table[name];
      // As in pymdownx.keys, one unknown key leaves the whole thing as text; quote it to show it anyway.
      keys.push({ name, label });
      pos = end;
    }
    if (src.charCodeAt(pos) !== PLUS) return;
    if (src.charCodeAt(pos + 1) === PLUS) return { keys, end: pos + 2 };
    pos++;
  }
}

// One markdown-it function per set of options, so every parse with the same options reuses Comark's cached parser.
const markdownIt = stable(({ separator = "+", keys: extra = {} }: KeysOptions) => {
  const table: Record<string, string> = { ...names };
  for (const [name, label] of Object.entries(extra)) table[name.toLowerCase()] = label;
  const rule = (state: StateInline, silent: boolean) => {
    const found = read(state, table);
    if (!found) return false;
    if (!silent) {
      state.push(`${SPAN}_open`, "span", 1).attrs = [["class", "ckb"]];
      for (const [index, key] of found.keys.entries()) {
        if (index && separator) {
          state.push(`${SPAN}_open`, "span", 1);
          state.push("text", "", 0).content = separator;
          state.push(`${SPAN}_close`, "span", -1);
        }
        const kbd = state.push(`${SPAN}_open`, "kbd", 1);
        if (key.name) kbd.attrs = [["class", `ckb-${key.name}`]];
        state.push("text", "", 0).content = key.label;
        state.push(`${SPAN}_close`, "kbd", -1);
      }
      state.push(`${SPAN}_close`, "span", -1);
    }
    state.pos = found.end;
    return true;
  };
  return (md: MarkdownExit) => addRule(md.inline.ruler, "before", ["emphasis"], "keys", rule);
});

/**
 * Keyboard keys, as in pymdownx.keys: `++ctrl+shift+k++` renders Ctrl, Shift, and K as `<kbd>` keys joined by `+`, in
 * a `.ckb` span. Names and aliases follow pymdownx.keys, and a quoted key, `++ctrl+"My Key"++`, shows its text.
 */
export default defineComarkPlugin<KeysOptions>((options = {}) => ({
  name: "comark-keys",
  markdownItPlugins: [markdownIt(options)],
}));
