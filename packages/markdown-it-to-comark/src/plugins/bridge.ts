import type { ComarkParseTokensState, ComarkPlugin, MarkdownExitPlugin } from "comark";
import { decodeHTML } from "entities";

type Token = ComarkParseTokensState["tokens"][number];
type MarkdownExit = Parameters<MarkdownExitPlugin>[0];
type TokenClass = new (type: string, tag: string, nesting: Token["nesting"]) => Token;
type Rule = (
  tokens: Token[],
  index: number,
  options: unknown,
  env: unknown,
  self: unknown,
) => unknown;
interface Renderer {
  rules: Record<string, Rule | undefined>;
  renderToken: (tokens: Token[], index: number, options: unknown) => string;
}

// SAFETY: Comark's tokens are instances of markdown-exit's Token class, which takes a type, a tag, and a nesting.
const tokenClass = (token: Token) => token.constructor as TokenClass;

// The token types Comark's tree builder draws itself (comark/dist/internal/parse/tree.js); any other type is dropped.
const KNOWN = new Set(
  [
    "inline",
    "text",
    "html_inline",
    "html_block",
    "code_inline",
    "math_inline",
    "math_block",
    "emoji",
    "hr",
    "hardbreak",
    "softbreak",
    "reference",
    "code_block",
    "fence",
    "image",
    ...[
      "blockquote",
      "bullet_list",
      "ordered_list",
      "list_item",
      "strong",
      "em",
      "link",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "sub",
      "sup",
      "s",
      "heading",
      "paragraph",
    ].flatMap((name) => [`${name}_open`, `${name}_close`]),
  ].concat(
    [
      "mdc_block",
      "mdc_block_slot",
      "mdc_inline_span",
      "mdc_block_shorthand",
      "mdc_inline_component",
    ].flatMap((name) => [`${name}_open`, `${name}_close`, name]),
  ),
);

const OPEN_TAG =
  /^<([A-Za-z][\w-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*\/?>$/;
const ATTRIBUTE = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
const TAG =
  /<\/?[A-Za-z][\w-]*(?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*\s*\/?>|<!--[\s\S]*?-->/g;

const VOID = new Set("area base br col embed hr img input link meta source track wbr".split(" "));

interface Opened {
  /** Void tags before the wrappers, such as markdown-it-footnote's `<hr>`. */
  before: string;
  tags: { tag: string; attrs: [string, string][] }[];
}

/**
 * HTML that only opens elements, such as `<div class="tip">\n` or `<hr>\n<section>\n<ol>\n`: the void tags it starts
 * with, then each opening tag in order. Anything else (text, a closed element) isn't a wrapper.
 */
function openTags(html: string): Opened | undefined {
  const opened: Opened = { before: "", tags: [] };
  let cursor = 0;
  for (const match of html.matchAll(TAG)) {
    if (html.slice(cursor, match.index).trim()) return undefined;
    cursor = match.index + match[0].length;
    const tag = OPEN_TAG.exec(match[0]);
    if (!tag) return undefined;
    const name = tag[1]!.toLowerCase();
    if (VOID.has(name) || match[0].endsWith("/>")) {
      if (opened.tags.length) return undefined;
      opened.before += match[0];
      continue;
    }
    const attrs: [string, string][] = [];
    for (const attribute of tag[2]!.matchAll(ATTRIBUTE))
      attrs.push([attribute[1]!, decodeHTML(attribute[2] ?? attribute[3] ?? attribute[4] ?? "")]);
    opened.tags.push({ tag: name, attrs });
  }
  if (html.slice(cursor).trim() || !opened.tags.length) return undefined;
  return opened;
}

/** Whether `html` closes exactly `tags`, innermost first. */
const closes = (html: string, tags: Opened["tags"]) =>
  html.replace(/\s+/g, "") ===
  tags
    .map(({ tag }) => `</${tag}>`)
    .reverse()
    .join("");

/** HTML a renderer rule wrote, as the inline tokens Comark reads raw HTML from: tags, and decoded text between them. */
function htmlTokens(html: string, make: TokenClass): Token[] {
  const tokens: Token[] = [];
  const text = (content: string) => {
    // Newlines between block tags are the renderer's formatting, not content.
    if (!content || (/^\s*$/.test(content) && content.includes("\n"))) return;
    const token = new make("text", "", 0);
    token.content = decodeHTML(content);
    tokens.push(token);
  };
  let cursor = 0;
  for (const match of html.matchAll(TAG)) {
    text(html.slice(cursor, match.index));
    const token = new make("html_inline", "", 0);
    token.content = match[0];
    tokens.push(token);
    cursor = match.index + match[0].length;
  }
  text(html.slice(cursor));
  return tokens;
}

/** The index of the token that closes `tokens[start]`, at the same nesting level. */
function closing(tokens: Token[], start: number): number {
  let depth = 0;
  for (let index = start; index < tokens.length; index++) {
    depth += tokens[index]!.nesting;
    if (depth === 0) return index;
  }
  return -1;
}

/**
 * Runs a markdown-it plugin in Comark, renderer and all. Comark parses with markdown-exit, a port of markdown-it, so a
 * plugin's parsing rules run as they are; but Comark builds its tree from tokens instead of calling markdown-it's
 * renderer, so a token type it doesn't know is dropped and a renderer rule the plugin sets is ignored. Each such token
 * is drawn with the plugin's own renderer rule here: a lone opening tag becomes an element whose children Comark
 * still parses, and anything else becomes the HTML the rule writes.
 */
let bridges = 0;

interface RulerHost {
  ruler: {
    disable?: (names: string, ignoreInvalid: boolean) => void;
    __rules__: {
      name: string;
      fn: (state: { pos: number; src: string }, silent: boolean) => boolean;
    }[];
    __cache__: unknown;
  };
}
// The rules bridged plugins added, by parser, for `precedence()`.
const bridgedRules = new WeakMap<
  object,
  { block: Set<string>; inline: Set<string>; core: Set<string> }
>();

/**
 * Bridged plugins' rules run before Comark's own syntax rules, so the project's `[^1]` footnote or `::: tip` container
 * isn't read first as a Comark span or component. Registered after Comark's components and attributes.
 */
export const precedence = (): ComarkPlugin => ({
  name: "markdown-it-to-comark:precedence",
  markdownItPlugins: [
    (instance: MarkdownExit) => {
      const added = bridgedRules.get(instance);
      if (!added) return;
      const host = instance as unknown as Record<"block" | "inline" | "core", RulerHost>;
      for (const chain of ["block", "inline"] as const) {
        const list = host[chain].ruler.__rules__;
        const first = list.findIndex((rule) => rule.name.startsWith("comark_"));
        if (first < 0) continue;
        const moved = list.slice(first).filter((rule) => added[chain].has(rule.name));
        if (!moved.length) continue;
        const rest = list.filter((rule) => !moved.includes(rule));
        rest.splice(first, 0, ...moved);
        host[chain].ruler.__rules__ = rest;
        host[chain].ruler.__cache__ = null;
      }
      // markdown-it-emoji replaces `:name:` after inline parsing, too late to stop Comark's `:name` component, so the
      // component rule leaves anything shaped like a shortcode as text for it. Unknown names stay text, as they would.
      // markdown-it-task-lists reads `[ ] ` at the start of a list item after inline parsing; Comark's span would take it.
      if ([...added.core].some((name) => /task/i.test(name))) {
        const rule = host.inline.ruler.__rules__.find((item) => item.name === "comark_inline_span");
        if (rule) {
          const fn = rule.fn;
          rule.fn = (state, silent) =>
            state.pos === 0 && /^\[[ xX]\][ \t]/.test(state.src.slice(0, 4))
              ? false
              : fn(state, silent);
          host.inline.ruler.__cache__ = null;
        }
      }
      // markdown-it-attrs reads `{.class}` after parsing too; it takes the place of Comark's attribute syntax.
      if (added.core.has("curly_attributes")) host.inline.ruler.disable?.("comark_inline_props", true);
      if (added.core.has("emoji")) {
        const rule = host.inline.ruler.__rules__.find(
          (item) => item.name === "comark_inline_component",
        );
        if (rule) {
          const fn = rule.fn;
          rule.fn = (state, silent) =>
            /^:[\w+-]+:/.test(state.src.slice(state.pos, state.pos + 80))
              ? false
              : fn(state, silent);
          host.inline.ruler.__cache__ = null;
        }
      }
    },
  ],
});

export function markdownItPlugin(plugin: unknown, ...options: unknown[]): ComarkPlugin {
  let md: MarkdownExit | undefined;
  const changed = new Set<string>();
  const name = typeof plugin === "function" && plugin.name ? plugin.name : "markdown-it plugin";
  return {
    // Comark keeps one plugin per name, and two bridges of the same plugin with different options are two plugins.
    name: `markdown-it:${name}:${++bridges}`,
    markdownItPlugins: [
      (instance: MarkdownExit) => {
        md = instance;
        const renderer = instance.renderer as unknown as Renderer;
        const before = { ...renderer.rules };
        const rules = (chain: RulerHost) => new Set(chain.ruler.__rules__.map((rule) => rule.name));
        const host = instance as unknown as Record<"block" | "inline" | "core", RulerHost>;
        const blockBefore = rules(host.block);
        const inlineBefore = rules(host.inline);
        const coreBefore = rules(host.core);
        // SAFETY: a markdown-it plugin takes the instance and its options; markdown-exit keeps markdown-it's `use`.
        instance.use(plugin as never, ...(options as []));
        for (const [type, rule] of Object.entries(renderer.rules))
          if (rule !== before[type]) changed.add(type);
        const added = bridgedRules.get(instance) ?? {
          block: new Set<string>(),
          inline: new Set<string>(),
          core: new Set<string>(),
        };
        for (const name of rules(host.block)) if (!blockBefore.has(name)) added.block.add(name);
        for (const name of rules(host.inline)) if (!inlineBefore.has(name)) added.inline.add(name);
        for (const name of rules(host.core)) if (!coreBefore.has(name)) added.core.add(name);
        bridgedRules.set(instance, added);
      },
    ],
    markdownItPost(state) {
      if (!md) return;
      const renderer = md.renderer as unknown as Renderer;
      const env = {};
      const render = (tokens: Token[], index: number): string | undefined => {
        const rule = renderer.rules[tokens[index]!.type];
        const html = rule
          ? rule(tokens, index, md!.options, env, renderer)
          : renderer.renderToken(tokens, index, md!.options);
        return typeof html === "string" ? html : undefined;
      };
      const wanted = (token: Token) => changed.has(token.type) || !KNOWN.has(token.type);
      const bridge = (tokens: Token[], block: boolean): Token[] => {
        const out: Token[] = [];
        const replace = new Map<number, Token[]>();
        for (let index = 0; index < tokens.length; index++) {
          const token = tokens[index]!;
          if (token.children) token.children = bridge(token.children, false);
          if (replace.has(index) || !wanted(token)) continue;
          const make = tokenClass(token);
          if (token.nesting === 1) {
            const end = closing(tokens, index);
            const open = render(tokens, index);
            const close = end > 0 ? render(tokens, end) : undefined;
            if (open === undefined || close === undefined) continue;
            const opened = openTags(open);
            if (opened && closes(close, opened.tags)) {
              // Elements, not raw HTML: Comark nests what follows an open HTML tag inside it, and inside a component
              // it drops the text of inline HTML (UPSTREAM.md).
              const kind = block ? "mdc_block_shorthand" : "mdc_inline_span";
              const element = (tag: Opened["tags"][number], nesting: 1 | -1) => {
                const made = new make(
                  `${kind}_${nesting === 1 ? "open" : "close"}`,
                  tag.tag,
                  nesting,
                );
                if (nesting === 1) made.attrs = tag.attrs;
                made.map = token.map;
                return made;
              };
              replace.set(index, [
                ...wrap(htmlTokens(opened.before, make), block, make, token),
                ...opened.tags.map((tag) => element(tag, 1)),
              ]);
              replace.set(
                end,
                [...opened.tags].reverse().map((tag) => element(tag, -1)),
              );
              continue;
            }
            replace.set(index, wrap(htmlTokens(open, make), block, make, token));
            replace.set(end, wrap(htmlTokens(close, make), block, make, tokens[end]!));
            continue;
          }
          if (token.nesting === -1) continue;
          const html = render(tokens, index);
          if (html === undefined) continue;
          // A block token inside a paragraph (markdown-it-footnote's back links) renders at the end of its text.
          let previous = index - 1;
          while (previous >= 0 && replace.get(previous)?.length === 0) previous--;
          const inline = tokens[previous];
          if (block && inline?.type === "inline" && inline.children) {
            inline.children.push(...htmlTokens(html, make));
            replace.set(index, []);
          } else replace.set(index, wrap(htmlTokens(html, make), block, make, token));
        }
        for (let index = 0; index < tokens.length; index++) {
          const replaced = replace.get(index);
          if (replaced) out.push(...replaced);
          else out.push(tokens[index]!);
        }
        return out;
      };
      state.tokens = bridge(state.tokens, true);
    },
  };
}

/** Block-level HTML goes in a paragraph of inline HTML, the way Comark's html plugin reads an HTML block. */
function wrap(tokens: Token[], block: boolean, make: TokenClass, from: Token): Token[] {
  if (!block) return tokens;
  if (!tokens.length) return [];
  const open = new make("paragraph_open", "p", 1);
  const inline = new make("inline", "", 0);
  const close = new make("paragraph_close", "p", -1);
  inline.children = tokens;
  inline.content = "";
  if (from.map) {
    open.map = from.map;
    inline.map = from.map;
  }
  return [open, inline, close];
}
