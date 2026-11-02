import type { ComarkParseTokensState, ComarkPlugin, MarkdownExitPlugin } from "comark";

type Token = ComarkParseTokensState["tokens"][number];
type MarkdownExit = Parameters<MarkdownExitPlugin>[0];

/** markdown-it's presets: `default` has tables and strikethrough, `commonmark` is the spec, `zero` only paragraphs. */
export type Preset = "default" | "commonmark" | "zero";

export interface MarkdownItOptions {
  preset?: Preset;
  html?: boolean;
  typographer?: boolean;
  /** Quote pairs for the typographer, as markdown-it takes them. */
  quotes?: string | string[];
  breaks?: boolean;
  linkify?: boolean;
  /** Rules turned on or off after the preset, as `md.enable()` and `md.disable()` take them. */
  enable?: string[];
  disable?: string[];
}

/**
 * Configures Comark's markdown-exit instance the way the project configured markdown-it: the preset, then the
 * options, then the rules it enabled or disabled. markdown-exit is a port of markdown-it, so its presets and rule
 * names are the same.
 */
export const markdownItOptions = (options: MarkdownItOptions): ComarkPlugin => ({
  name: "markdown-it-to-comark:options",
  markdownItPlugins: [
    (md: MarkdownExit) => {
      // Comark builds its parser with tables and strikethrough on; a preset resets the rules to its own list.
      if (options.preset && options.preset !== "default") md.configure(options.preset);
      const set: Record<string, unknown> = { html: Boolean(options.html) };
      if (options.typographer !== undefined) set.typographer = options.typographer;
      if (options.quotes !== undefined) set.quotes = options.quotes;
      if (options.breaks !== undefined) set.breaks = options.breaks;
      if (options.linkify !== undefined) set.linkify = options.linkify;
      md.set(set);
      if (options.enable?.length) md.enable(options.enable, true);
      if (options.disable?.length) md.disable(options.disable, true);
    },
  ],
  markdownItPost(state) {
    for (const block of state.tokens) {
      const children = block.children;
      if (block.type !== "inline" || !children) continue;
      for (let index = 0; index < children.length; index++) {
        const token = children[index]!;
        // Comark reads any text that starts with `<!--` as a comment, even with HTML off, where markdown-it shows it.
        if (!options.html && token.type === "text" && token.content.startsWith("<!--")) {
          const rest = new (token.constructor as new (
            type: string,
            tag: string,
            nesting: number,
          ) => Token)("text", "", 0);
          rest.content = token.content.slice(1);
          token.content = "<";
          children.splice(index + 1, 0, rest);
          index++;
          continue;
        }
        // markdown-it renders a soft break as `<br>` with `breaks`; Comark reads soft breaks as a newline either way.
        if (options.breaks && token.type === "softbreak") rename(token, "hardbreak", "br");
        // markdown-it draws strikethrough as `<s>`, and Comark's tree builder writes every `s_open` as `<del>`.
        else if (token.type === "s_open") rename(token, "mdc_inline_span_open", "s");
        else if (token.type === "s_close") rename(token, "mdc_inline_span_close", "s");
      }
    }
  },
});

function rename(token: Token, type: string, tag: string) {
  token.type = type;
  token.tag = tag;
}
