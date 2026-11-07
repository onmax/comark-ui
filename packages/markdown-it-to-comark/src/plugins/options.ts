import type { ComarkParseTokensState, ComarkPlugin, MarkdownExitPlugin } from "comark";
import MarkdownIt from "markdown-it";
import { isText } from "../guards.ts";
import { drawHtml, rendererOf } from "./bridge.ts";

type Token = ComarkParseTokensState["tokens"][number];
type MarkdownExit = Parameters<MarkdownExitPlugin>[0];
type TokenClass = new (type: string, tag: string, nesting: Token["nesting"]) => Token;

/** markdown-it's presets: `default` has tables and strikethrough, `commonmark` is the spec, `zero` only paragraphs. */
export type Preset = "default" | "commonmark" | "zero";

/** One `md.enable()` or `md.disable()` call, as `["disable", ["emphasis"]]`. */
export type RuleChange = ["enable" | "disable", string[]];

export interface MarkdownItOptions {
  preset?: Preset;
  html?: boolean;
  typographer?: boolean;
  /** Quote pairs for the typographer, as markdown-it takes them. */
  quotes?: string | string[];
  breaks?: boolean;
  linkify?: boolean;
  /** Rules turned on after the preset and the plugins, as `md.enable()` takes them. */
  enable?: string[];
  /** Rules turned off after the preset and the plugins, as `md.disable()` takes them. */
  disable?: string[];
  /** `enable` and `disable` calls in the order the project made them, for when the order matters. */
  rules?: RuleChange[];
}

/** Every rule change, in order: `rules` as written, else `enable` then `disable`. */
export function ruleChanges(options: MarkdownItOptions): RuleChange[] {
  const changes: RuleChange[] = [...(options.rules ?? [])];
  if (options.enable?.length) changes.push(["enable", options.enable]);
  if (options.disable?.length) changes.push(["disable", options.disable]);
  return changes;
}

/**
 * Configures Comark's markdown-exit instance the way the project configured markdown-it: the preset, then the
 * options. markdown-exit is a port of markdown-it, so its presets and rule names are the same. Registered first, so
 * the preset resets the rules before other plugins add theirs.
 */
export const markdownItOptions = (options: MarkdownItOptions): ComarkPlugin => ({
  name: "markdown-it-to-comark:options",
  markdownItPlugins: [
    (md: MarkdownExit) => {
      // SAFETY: markdown-exit consumes the same match/test API. Keep markdown-it's linkifier version and its
      // plugin customization API, including schema aliases, even when linkification is off.
      md.linkify = new MarkdownIt().linkify as unknown as MarkdownExit["linkify"];
      // Comark builds its parser with tables and strikethrough on; a preset resets the rules to its own list.
      if (options.preset && options.preset !== "default") md.configure(options.preset);
      md.set({ html: Boolean(options.html) });
      md.set({ linkify: options.linkify ?? false });
      // Only what the project set: markdown-exit's own defaults are markdown-it's.
      for (const name of ["typographer", "quotes", "breaks"] as const)
        if (options[name] !== undefined) md.set({ [name]: options[name] });
    },
  ],
  // Before the HTML fixes, which read soft breaks: markdown-it renders one as `<br>` with `breaks`, and Comark reads
  // soft breaks as a newline either way.
  markdownItPost(state) {
    if (!options.breaks) return;
    for (const block of state.tokens)
      for (const token of block.children ?? [])
        if (token.type === "softbreak") rename(token, "hardbreak", "br");
  },
});

/**
 * The rest of markdown-it's behavior, registered after the project's plugins: rule changes in order, so one can turn
 * off a plugin's rule, and the token fixes that make Comark draw what markdown-it's renderer draws, after
 * `markdownItPlugin()` has drawn the tokens whose renderer a plugin changed.
 */
export const markdownItTokens = (options: MarkdownItOptions): ComarkPlugin => {
  let md: MarkdownExit | undefined;
  return {
    name: "markdown-it-to-comark:tokens",
    markdownItPlugins: [
      (instance: MarkdownExit) => {
        md = instance;
        for (const [method, names] of ruleChanges(options)) instance[method](names, true);
      },
    ],
    markdownItPost(state) {
      const fix = (tokens: Token[]) => {
        for (let index = 0; index < tokens.length; index++) {
          const token = tokens[index]!;
          if (token.children) fix(token.children);
          // Comark drops a heading with no text; markdown-it writes `<h2></h2>`.
          if (
            token.type === "heading_open" &&
            !tokens[index + 1]?.children?.some((child) => child.content || child.type !== "text") &&
            tokens[index + 2]?.type === "heading_close"
          ) {
            rename(token, "mdc_block_shorthand_open", token.tag);
            rename(tokens[index + 2]!, "mdc_block_shorthand_close", token.tag);
            tokens.splice(index + 1, 1);
            index++;
            continue;
          }
          // Comark reads a fence's language with its own grammar, which stops at `[` and `{` and drops a language that
          // starts with punctuation (`jsx:title=a/[...].js`, `{r}`); such a fence is drawn by markdown-it's renderer.
          // Escapes and entities too (`foo&#35;`): Comark reads the info string as written.
          const raw = token.info.trim().split(/\s+/)[0] ?? "";
          const lang = md ? language(token.info, md) : raw;
          if (token.type === "fence" && md && (/[^\w+#.:/@-]/.test(lang) || lang !== raw)) {
            const renderer = rendererOf(md);
            const html = renderer.rules.fence?.(tokens, index, md.options, {}, renderer);
            if (isText(html)) {
              // SAFETY: Comark's tokens are instances of markdown-exit's Token class.
              const drawn = drawHtml(html, token.constructor as TokenClass);
              tokens.splice(index, 1, ...drawn);
              index += drawn.length - 1;
              continue;
            }
          }
          // markdown-it-anchor's permalink symbol is an `html_block` inside a heading's text, which Comark only reads
          // between blocks.
          if (token.type === "html_block" && tokens !== state.tokens) {
            // SAFETY: Comark's tokens are instances of markdown-exit's Token class.
            const drawn = drawHtml(token.content, token.constructor as TokenClass);
            tokens.splice(index, 1, ...drawn);
            index += drawn.length - 1;
            continue;
          }
          // Comark reads any text that starts with `<!--` as a comment, even text markdown-it shows (HTML off, a
          // comment inside code a renderer rule drew), and drops what follows.
          if (token.type === "text" && token.content.startsWith("<!--")) {
            // SAFETY: Comark's tokens are instances of markdown-exit's Token class.
            const rest = new (token.constructor as TokenClass)("text", "", 0);
            rest.content = token.content.slice(1);
            token.content = "<";
            tokens.splice(index + 1, 0, rest);
            index++;
            continue;
          }
          // markdown-it draws strikethrough as `<s>`, and Comark's tree builder writes every `s_open` as `<del>`.
          if (token.type === "s_open") rename(token, "mdc_inline_span_open", "s");
          else if (token.type === "s_close") rename(token, "mdc_inline_span_close", "s");
        }
      };
      fix(state.tokens);
    },
  };
};

/** A fence's language as markdown-it reads it: the first word of its info string, escapes and entities resolved. */
function language(info: string, md: MarkdownExit): string {
  const utils: { unescapeAll?: (text: string) => string } | undefined = Reflect.get(md, "utils");
  const unescape = utils?.unescapeAll;
  return (unescape ? unescape(info) : info).trim().split(/\s+/)[0] ?? "";
}

function rename(token: Token, type: string, tag: string) {
  token.type = type;
  token.tag = tag;
}
