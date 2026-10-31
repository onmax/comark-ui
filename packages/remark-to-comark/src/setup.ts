import type { ComarkPlugin, ParserOptions } from "comark";
import html from "comark/plugins/html";
import taskList from "comark/plugins/task-list";
import components from "comark/plugins/components";
import attributes from "comark/plugins/attributes";
import { frontmatter } from "./plugins/frontmatter.ts";
import {
  closeInlineHtml,
  commonmark,
  dropHtml,
  imageAlt,
  footnotes,
  gfmLinks,
  htmlEntities,
  htmlParagraphs,
  htmlWhitespace,
  tightLists,
} from "./plugins/gfm.ts";

/** Comark's plugins and parser options, as `comarkSetup()` returns them. */
export interface ComarkSetup {
  plugins: ComarkPlugin[];
  options: Omit<ParserOptions, "plugins">;
}

export interface SetupOptions {
  /**
   * `comark` keeps Comark's components and attributes, so the content codemod escapes text that would read as them.
   * `plain` turns them off and the Markdown needs no changes for them.
   */
  syntax?: "comark" | "plain";
  /** `false` drops raw HTML, as remark-rehype does by default and remark-html does when it sanitizes. */
  html?: boolean;
  plugins?: ComarkPlugin[];
  /** `false` reads plain CommonMark, for a pipeline without remark-gfm: no tables, strikethrough, task lists, footnotes, or autolinks. */
  gfm?: boolean;
  /** `false` reads a leading `---` block as Markdown, for a pipeline without remark-frontmatter. */
  frontmatter?: boolean;
}

/** The Comark parser that reads Markdown the way remark-parse with remark-gfm does. */
export function comarkSetup(options: SetupOptions = {}): ComarkSetup {
  const syntax = options.syntax ?? "comark";
  const gfm = options.gfm !== false;
  // Static content is complete, so auto-close would only change it; remark never unwraps a lone paragraph.
  const parserOptions: ComarkSetup["options"] = {
    registerDefaultPlugins: false,
    autoClose: false,
    autoUnwrap: false,
  };
  if (!gfm) parserOptions.linkify = false;
  return {
    plugins: [
      ...(options.frontmatter === false ? [] : [frontmatter()]),
      ...(options.html === false
        ? [dropHtml()]
        : // CommonMark HTML blocks are raw until a blank line; Comark otherwise reads Markdown inside them.
          [
            htmlWhitespace(),
            htmlParagraphs(),
            html({ markdown: false }),
            htmlEntities(),
            closeInlineHtml(),
          ]),
      ...(gfm ? [taskList()] : [commonmark()]),
      ...(syntax === "comark" ? [components(), attributes()] : []),
      ...(gfm ? [footnotes(), gfmLinks()] : []),
      tightLists(),
      imageAlt(),
      ...(options.plugins ?? []),
    ],
    options: parserOptions,
  };
}

/** `comarkSetup()` as one options object for `parseMarkdown`, `renderHtml`, or a renderer's `options` prop. */
// The index signature lets the result go straight into `renderHtml`, whose options also take renderer settings.
export function comarkOptions(options: SetupOptions = {}): ParserOptions & Record<string, unknown> {
  const setup = comarkSetup(options);
  return { ...setup.options, plugins: setup.plugins };
}
