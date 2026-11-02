import type { ComarkPlugin, ParserOptions } from "comark";
import attributes from "comark/plugins/attributes";
import components from "comark/plugins/components";
import html from "comark/plugins/html";
import taskList from "comark/plugins/task-list";
import { frontmatter } from "./plugins/frontmatter.ts";
import {
  breakEndTags,
  breaks,
  emptyHeadings,
  expandTabs,
  headerIds,
  htmlBlocks,
  htmlIndent,
  htmlPre,
  inlineHtml,
  langPrefix,
  legacyTables,
  linkText,
  markedEmails,
  taskListClasses,
  underscoreTagText,
  underscoreTags,
} from "./plugins/marked.ts";
import {
  closeInlineHtml,
  commonmark,
  dropHtml,
  gfmLinks,
  htmlEntities,
  htmlParagraphs,
  htmlWhitespace,
  imageAlt,
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
  /** `false` drops raw HTML, for a setup that sanitized marked's output. */
  html?: boolean;
  plugins?: ComarkPlugin[];
  /** `false` reads plain CommonMark, like marked with `gfm: false`: no tables, strikethrough, task lists, or autolinks. */
  gfm?: boolean;
  /** `true` turns single line breaks into `<br>`, like marked's `breaks: true`. */
  breaks?: boolean;
  /** `true` reads a leading `---` block as frontmatter, for a project that strips it before marked (gray-matter, front-matter). */
  frontmatter?: boolean;
  /** Heading ids as marked before v8 wrote them by default (`headerIds`), with its slugger; `legacy` for marked before 0.6. */
  headerIds?: boolean | "legacy";
  /** What marked's `headerPrefix` put before each of those ids. */
  headerPrefix?: string;
  /** Tabs as marked before v14 rewrote them: `all` (before v4) or a line's `leading` ones (v4 to v13). */
  expandTabs?: "all" | "leading";
  /** Tables as marked 0.3 split them, on every `|`, with each row's own cells. */
  legacyTables?: boolean;
  /** Tag names with an underscore (`<my_el>`) read as HTML, as marked from v1 to v17 read them. */
  underscoreTags?: boolean;
  /** The class before a code block's language, `language-` unless set; marked 0.3 wrote `lang-`. */
  langPrefix?: string;
  /** Comark's own heading ids, for marked-gfm-heading-id; see Comark's `headingIds`. */
  headingIds?: ParserOptions["headingIds"];
}

/** The Comark parser that reads Markdown the way marked does with its defaults. */
export function comarkSetup(options: SetupOptions = {}): ComarkSetup {
  const syntax = options.syntax ?? "comark";
  const gfm = options.gfm !== false;
  // Static content is complete, so auto-close would only change it; marked never unwraps a lone paragraph.
  const parserOptions: ComarkSetup["options"] = {
    registerDefaultPlugins: false,
    autoClose: false,
    autoUnwrap: false,
    headingIds: options.headerIds ? false : (options.headingIds ?? false),
  };
  if (!gfm) parserOptions.linkify = false;
  return {
    plugins: [
      ...(options.frontmatter ? [frontmatter()] : []),
      ...(options.expandTabs ? [expandTabs(options.expandTabs)] : []),
      ...(options.legacyTables ? [legacyTables()] : []),
      // Before the HTML workarounds, which turn soft breaks into text.
      // marked reads `breaks` only with GFM on.
      ...(options.breaks && gfm ? [breaks()] : []),
      ...(options.html === false
        ? [dropHtml()]
        : // CommonMark HTML blocks are raw until a blank line; Comark otherwise reads Markdown inside them.
          [
            ...(options.underscoreTags ? [underscoreTags()] : []),
            emptyHeadings(),
            breakEndTags(),
            htmlIndent(),
            htmlWhitespace(),
            inlineHtml(),
            htmlParagraphs(),
            html({ markdown: false }),
            ...(options.underscoreTags ? [underscoreTagText()] : []),
            htmlPre(),
            htmlEntities(),
            closeInlineHtml(),
            htmlBlocks(),
          ]),
      ...(gfm ? [taskList(), taskListClasses()] : [commonmark()]),
      ...(syntax === "comark" ? [components(), attributes()] : []),
      ...(gfm ? [gfmLinks(), markedEmails()] : []),
      linkText(),
      tightLists(),
      imageAlt(),
      ...(options.headerIds ? [headerIds(options.headerIds, options.headerPrefix)] : []),
      ...(options.langPrefix !== undefined && options.langPrefix !== "language-"
        ? [langPrefix(options.langPrefix)]
        : []),
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
