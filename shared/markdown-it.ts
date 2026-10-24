// Bundled by every package that adds Markdown syntax; it isn't a package of its own, so nothing here is published apart
// from them. Comark turns markdown-exit tokens into nodes through a closed table: an inline token it doesn't know
// loses its wrapper, and a block one is dropped or left empty. So a plugin emits, or renames its tokens to, types
// Comark builds into an element named by `token.tag`, with the token's attrs and any `{attrs}` after it.
import type { MarkdownExitPlugin } from "comark";

export type MarkdownExit = Parameters<MarkdownExitPlugin>[0];
export type StateBlock = Parameters<MarkdownExit["block"]["tokenize"]>[0];
export type StateInline = Parameters<MarkdownExit["inline"]["tokenize"]>[0];
export type Token = StateBlock["tokens"][number];

/**
 * An inline element and a block element, by the prefix of their `_open` and `_close` types. Not `mdc_block_slot` for
 * blocks: directly inside a `::component` Comark reads those as named slots and splits the block apart.
 */
export const SPAN = "mdc_inline_span";
export const BLOCK = "blockquote";

/**
 * Renames `<type>_open` and `<type>_close` tokens, nested ones too, to a span or a block, keeping their tag and
 * attrs: `mark_open` and `mark_close` are renamed with `{ mark: SPAN }`.
 */
export function renameTokens(tokens: Token[], renames: Record<string, typeof SPAN | typeof BLOCK>) {
  for (const token of tokens) {
    if (token.children) renameTokens(token.children, renames);
    const match = /^(.+)_(open|close)$/.exec(token.type);
    const generic = match?.[1] === undefined ? undefined : renames[match[1]];
    if (match && generic) token.type = `${generic}_${match[2]}`;
  }
}

interface Ruler<T> {
  before(anchor: string, name: string, fn: T, options?: { alt?: string[] }): void;
  after(anchor: string, name: string, fn: T, options?: { alt?: string[] }): void;
  push(name: string, fn: T, options?: { alt?: string[] }): void;
}

/**
 * Adds a rule before or after the first of `anchors` the parser has, else last. Comark's own rules exist only with
 * its default plugins, and markdown-exit throws on a missing anchor, which would make every parse throw.
 */
export function addRule<T>(
  ruler: Ruler<T>,
  place: "before" | "after",
  anchors: string[],
  name: string,
  fn: T,
  options?: { alt?: string[] },
) {
  for (const anchor of anchors) {
    try {
      ruler[place](anchor, name, fn, options);
      return;
    } catch {
      // Not in this parser; try the next anchor.
    }
  }
  ruler.push(name, fn, options);
}

/**
 * One markdown-it function per set of options. Comark caches a parser per list of these functions by identity, so a
 * function built on every call would build a new parser on every parse and push the others out of its cache.
 */
export function stable<T>(build: (options: T) => MarkdownExitPlugin) {
  const built = new Map<string, MarkdownExitPlugin>();
  return (options: T): MarkdownExitPlugin => {
    const key = JSON.stringify(options) ?? "";
    let fn = built.get(key);
    if (!fn) built.set(key, (fn = build(options)));
    return fn;
  };
}
