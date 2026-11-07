import type { ComarkPlugin, ParserOptions } from "comark";
import html from "comark/plugins/html";
import components from "comark/plugins/components";
import attributes from "comark/plugins/attributes";
import { frontmatter } from "./plugins/frontmatter.ts";
import {
  closeInlineHtml,
  htmlBlocks,
  htmlEntities,
  htmlParagraphs,
  htmlWhitespace,
  imageAlt,
  tightLists,
} from "./plugins/html.ts";
import { precedence } from "./plugins/bridge.ts";
import { markdownItOptions, markdownItTokens, type MarkdownItOptions } from "./plugins/options.ts";

/** Comark's plugins and parser options, as `comarkSetup()` returns them. */
export interface ComarkSetup {
  plugins: ComarkPlugin[];
  options: Omit<ParserOptions, "plugins">;
}

export interface SetupOptions extends MarkdownItOptions {
  /**
   * `comark` keeps Comark's components and attributes, so the content codemod escapes text that would read as them.
   * `plain` turns them off and the Markdown needs no changes for them.
   */
  syntax?: "comark" | "plain";
  /** Comark plugins, and markdown-it plugins wrapped in `markdownItPlugin()` from markdown-it-to-comark/plugins. */
  plugins?: ComarkPlugin[];
  /**
   * `true` reads a leading `---` block as frontmatter, for sites that strip it before markdown-it renders (VitePress,
   * Eleventy, markdown-it-front-matter). markdown-it itself reads it as Markdown, so it's off by default.
   */
  frontmatter?: boolean;
}

/**
 * The Comark parser that reads Markdown the way markdown-it does with the same preset and options. markdown-it's
 * defaults are `html: false` and `linkify: false`, the opposite of Comark's, so each follows the project's setup.
 */
export function comarkSetup(options: SetupOptions = {}): ComarkSetup {
  const syntax = options.syntax ?? "comark";
  const keepHtml = options.html ?? options.preset === "commonmark";
  return {
    plugins: [
      ...(options.frontmatter ? [frontmatter()] : []),
      // First, so the preset resets markdown-exit's rules before the other plugins add theirs.
      markdownItOptions({ ...options, html: keepHtml }),
      // CommonMark HTML blocks are raw until a blank line; Comark otherwise reads Markdown inside them.
      ...(keepHtml
        ? [
            htmlWhitespace(),
            htmlParagraphs(),
            html({ markdown: false }),
            htmlBlocks(),
            htmlEntities(),
            closeInlineHtml(),
          ]
        : []),
      // Before components, so a block rule they share a trigger with (`::: tip`) is the project's.
      ...(options.plugins ?? []),
      markdownItTokens({ ...options, html: keepHtml }),
      ...(syntax === "comark" ? [components(), attributes(), precedence()] : []),
      tightLists(),
      imageAlt(),
    ],
    // Static content is complete, so auto-close would only change it; markdown-it never unwraps a lone paragraph.
    options: {
      registerDefaultPlugins: false,
      autoClose: false,
      autoUnwrap: false,
    },
  };
}

/** `comarkSetup()` as one options object for `parseMarkdown`, `renderHtml`, or a renderer's `options` prop. */
// The index signature lets the result go straight into `renderHtml`, whose options also take renderer settings.
export function comarkOptions(options: SetupOptions = {}): ParserOptions & Record<string, unknown> {
  const setup = comarkSetup(options);
  return { ...setup.options, plugins: setup.plugins };
}
