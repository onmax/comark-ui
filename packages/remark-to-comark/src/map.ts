/**
 * What each remark, rehype, or Gatsby plugin becomes on Comark.
 *
 * - `pipeline`: part of the remark → HTML plumbing; Comark's parser and renderer replace it.
 * - `setup`: covered by `comarkSetup()` (GFM, frontmatter, raw HTML).
 * - `builtin`: Comark does it without a plugin.
 * - `plugin`: a Comark plugin does the same job; `use` is the import and `call` the expression.
 * - `port`: this package ships a Comark port; `use` points at it.
 * - `lint`: checks Markdown instead of rendering it; comark-linter is the counterpart.
 * - `custom`: the project's own plugin, or a list built in code the scan doesn't follow; it needs porting by hand.
 * - `unsupported`: no counterpart yet; the note says what to do.
 */
export type MappingKind =
  | "pipeline"
  | "setup"
  | "builtin"
  | "plugin"
  | "port"
  | "lint"
  | "custom"
  | "unsupported";

export interface Mapping {
  kind: MappingKind;
  /** `import x from "y"` for the Comark counterpart, with `x` as the local name. */
  use?: { name: string; from: string; named?: boolean };
  /** The plugin expression; `$options` is replaced with the original options when there are any. */
  call?: string;
  /** The component `@comark/html` needs to draw the plugin's nodes, imported by name from `use.from`. */
  component?: string;
  note?: string;
  /** The comark-ui package for the same feature, styled and themed, when there is one; its markup differs from the remark plugin's. */
  ui?: string;
}

const UI_DOCS = "https://comark-ui.onmax.me";

/** The comark-ui docs page for a package, such as `comark-links` → https://comark-ui.onmax.me/links/. */
export const uiDocs = (name: string) =>
  `${UI_DOCS}/${name === "comark-mathml" ? "math" : name.replace(/^comark-/, "")}/`;

// comark-ui packages that do what a remark plugin does, by remark plugin.
const UI = new Map(
  Object.entries({
    "remark-gfm": "comark-footnotes",
    "rehype-autolink-headings": "comark-links",
    "gatsby-remark-autolink-headers": "comark-links",
    "rehype-external-links": "comark-links",
    "remark-toc": "comark-outline",
    "rehype-toc": "comark-outline",
    "@stefanprobst/rehype-extract-toc": "comark-outline",
    "remark-reading-time": "comark-reading-time",
    "gatsby-remark-reading-time": "comark-reading-time",
    "remark-math": "comark-mathml",
    "rehype-katex": "comark-mathml",
    "rehype-mathjax": "comark-mathml",
    "remark-github-blockquote-alert": "comark-github",
    "remark-github-alerts": "comark-github",
    "remark-gfm-alerts": "comark-github",
    "@r4ai/remark-callout": "comark-github",
    "remark-github": "comark-github",
    "@docusaurus/remark-plugin-npm2yarn": "comark-tabs",
    "remark-deflist": "comark-deflist",
    "remark-definition-list": "comark-deflist",
    "rehype-figure": "comark-figure",
    "remark-figure-caption": "comark-figure",
    "remark-embedder": "comark-embed",
    "remark-oembed": "comark-embed",
    "gatsby-remark-responsive-iframe": "comark-embed",
    "remark-kbd": "comark-keys",
    "remark-supersub": "comark-mark",
  }),
);

const pipeline: Mapping = { kind: "pipeline" };
const setup = (note: string): Mapping => ({ kind: "setup", note });
const builtin = (note: string): Mapping => ({ kind: "builtin", note });
const plugin = (name: string, from: string, call: string, note?: string): Mapping => ({
  kind: "plugin",
  use: { name, from },
  call,
  note,
});
const port = (name: string, call: string, note?: string): Mapping => ({
  kind: "port",
  use: { name, from: "remark-to-comark/plugins", named: true },
  call,
  note,
});
const unsupported = (note: string): Mapping => ({ kind: "unsupported", note });

const shiki = plugin(
  "highlight",
  "comark/plugins/highlight",
  "highlight()",
  "Shiki highlighting. Theme options differ: pass Shiki theme registrations as `themes: { light, dark }`. Line-highlight meta is read from the fence.",
);

const plugins = {
  unified: pipeline,
  remark: pipeline,
  rehype: pipeline,
  "remark-parse": pipeline,
  "remark-rehype": pipeline,
  "rehype-stringify": pipeline,
  "remark-stringify": unsupported(
    "Comark renders Markdown back with `renderMarkdown` from `comark/render`; formatting options differ.",
  ),
  "remark-html": pipeline,
  "rehype-parse": unsupported(
    "Parsing HTML into a tree is outside Comark; keep rehype for HTML input.",
  ),
  "rehype-raw": setup("Raw HTML is parsed by Comark's html plugin."),
  "remark-gfm": setup("GFM tables, task lists, strikethrough, autolinks, and footnotes."),
  "remark-frontmatter": setup("Frontmatter is parsed into `document.frontmatter`."),
  "remark-mdx-frontmatter": setup(
    "Comark exposes frontmatter on the document; there is no ESM export to generate.",
  ),
  "remark-extract-frontmatter": setup("Comark exposes frontmatter on the document."),
  "rehype-slug": port(
    "slug",
    "slug($options)",
    "Comark gives headings ids already, but collapses repeated hyphens; the port matches github-slugger.",
  ),
  "remark-slug": port("slug", "slug()"),
  "remark-heading-id": builtin("`# Title {#id}` is Comark attribute syntax."),
  "remark-custom-heading-id": builtin("`# Title {#id}` is Comark attribute syntax."),
  "remark-attr": builtin("`{.class #id key=value}` after an element is Comark attribute syntax."),
  "remark-directive": builtin(
    "Directives become Comark components; the content codemod rewrites `:::name[label]{attrs}`.",
  ),
  "remark-mdc": builtin("MDC is Comark's component syntax."),
  "remark-admonitions": builtin(
    "Admonitions become components; the content codemod rewrites `:::note`.",
  ),
  "remark-code-titles": builtin("Comark reads a fence's `[filename]` meta."),
  "remark-code-title": builtin("Comark reads a fence's `[filename]` meta."),
  "rehype-code-titles": builtin("Comark reads a fence's `[filename]` meta."),
  "remark-math": {
    ...plugin(
      "math",
      "@comark/html/plugins/math",
      "math()",
      "KaTeX options go in `math({ options })`; other renderers take `Math` from their own `plugins/math`.",
    ),
    component: "Math",
  },
  "rehype-katex": {
    ...plugin(
      "math",
      "@comark/html/plugins/math",
      "math()",
      "KaTeX renders through the `Math` component; KaTeX options go in `math({ options })`.",
    ),
    component: "Math",
  },
  "rehype-mathjax": unsupported(
    "Comark renders math with KaTeX; MathJax output has no counterpart.",
  ),
  "remark-breaks": plugin("breaks", "comark/plugins/breaks", "breaks()"),
  "remark-emoji": plugin("emoji", "comark/plugins/emoji", "emoji()"),
  "remark-gemoji": {
    ...plugin("emoji", "comark/plugins/emoji", "emoji()"),
    note: "Comark's emoji plugin knows fewer shortcodes than gemoji (`:test_tube:` stays as written); check pages that use rarer ones.",
  },
  "remark-smartypants": plugin("punctuation", "comark/plugins/punctuation", "punctuation()"),
  "remark-toc": plugin(
    "toc",
    "comark/plugins/toc",
    "toc($options)",
    "Comark puts the table of contents in `document.meta.toc` instead of a list under a heading.",
  ),
  "rehype-toc": plugin(
    "toc",
    "comark/plugins/toc",
    "toc($options)",
    "Comark puts the table of contents in `document.meta.toc`.",
  ),
  "@stefanprobst/rehype-extract-toc": plugin("toc", "comark/plugins/toc", "toc()"),
  "rehype-starry-night": shiki,
  "remark-github": {
    kind: "plugin",
    use: { name: "references", from: "comark-github", named: true },
    call: "references($options)",
    note: "`@user`, `#123`, and `owner/name#123` as links; set `repo`.",
  },
  "rehype-document": unsupported(
    "Wraps the HTML in a page; keep it as a rehype step on the HTML Comark renders.",
  ),
  "rehype-meta": unsupported(
    "Adds page metadata; keep it as a rehype step on the HTML Comark renders.",
  ),
  "rehype-preset-minify": unsupported(
    "Minifies HTML; keep it as a rehype step on the HTML Comark renders.",
  ),
  "rehype-format": unsupported(
    "Formats HTML; keep it as a rehype step on the HTML Comark renders.",
  ),
  "rehype-pretty-code": shiki,
  "@shikijs/rehype": shiki,
  "rehype-shiki": shiki,
  "rehype-highlight": shiki,
  "rehype-prism": shiki,
  "rehype-prism-plus": shiki,
  "@mapbox/rehype-prism": shiki,
  "gatsby-remark-prismjs": shiki,
  "remark-mermaid": {
    ...plugin("mermaid", "@comark/html/plugins/mermaid", "mermaid()"),
    component: "Mermaid",
  },
  "rehype-mermaid": {
    ...plugin("mermaid", "@comark/html/plugins/mermaid", "mermaid()"),
    component: "Mermaid",
  },
  "rehype-sanitize": unsupported(
    "Comark's security plugin keeps tags hast-util-sanitize's schema removes (scripts, iframes); a rewrite would weaken the sanitizing. Keep rehype-sanitize on the HTML Comark renders.",
  ),
  "remark-github-blockquote-alert": plugin("alert", "comark/plugins/alert", "alert()"),
  "remark-github-alerts": plugin("alert", "comark/plugins/alert", "alert()"),
  "remark-gfm-alerts": plugin("alert", "comark/plugins/alert", "alert()"),
  "@r4ai/remark-callout": plugin("alert", "comark/plugins/alert", "alert()"),
  "rehype-autolink-headings": port("autolinkHeadings", "autolinkHeadings($options)"),
  "gatsby-remark-autolink-headers": port("autolinkHeadings", "autolinkHeadings()"),
  "rehype-external-links": port("externalLinks", "externalLinks($options)"),
  "rehype-unwrap-images": port("unwrapImages", "unwrapImages()"),
  "remark-unwrap-images": port("unwrapImages", "unwrapImages()"),
  "remark-squeeze-paragraphs": port("squeezeParagraphs", "squeezeParagraphs()"),
  "@docusaurus/remark-plugin-npm2yarn": port(
    "npm2yarn",
    "npm2yarn($options)",
    "Writes a `::code-group` per package manager (npm, yarn, pnpm); register comark-tabs' parser and renderer to draw it as tabs. `sync` and custom `converters` aren't supported.",
  ),
  "remark-reading-time": port("readingTime", "readingTime()", "Writes `meta.readingTime`."),
  "remark-code-import": unsupported(
    "Comark has no file access while parsing; inline the snippet or resolve it before parsing.",
  ),
  "rehype-img-size": unsupported(
    "Reads image files from disk; set width and height with `{width=… height=…}` attributes.",
  ),
  "gatsby-remark-images": unsupported("Image processing belongs to Gatsby's pipeline."),
  "gatsby-remark-copy-linked-files": unsupported(
    "Asset copying belongs to the build, not the parser.",
  ),
  "gatsby-remark-responsive-iframe": unsupported("Wrap embeds with comark-embed's `::embed`."),
  "gatsby-remark-reading-time": port("readingTime", "readingTime()", "Writes `meta.readingTime`."),
  "gatsby-remark-unwrap-images": port("unwrapImages", "unwrapImages()"),
  "gatsby-remark-relative-images": unsupported(
    "Path rewriting belongs to the build; resolve image paths before or after parsing.",
  ),
  "mdx-mermaid": {
    ...plugin("mermaid", "@comark/html/plugins/mermaid", "mermaid()"),
    component: "Mermaid",
  },
  "gatsby-remark-smartypants": plugin("punctuation", "comark/plugins/punctuation", "punctuation()"),
  "gatsby-remark-code-titles": builtin("Comark reads a fence's `[filename]` meta."),
  "remark-mdx": unsupported(
    "MDX's JSX and expressions need a JavaScript runtime; Comark components cover JSX that only passes props.",
  ),
  "rehype-mdx-code-props": unsupported("MDX only."),
  "rehype-accessible-emojis": unsupported(
    "No counterpart; wrap emoji in `:span{role=img aria-label=…}` where it matters.",
  ),
  "remark-validate-links": { kind: "lint", note: "Use comark-linter." },
  "remark-lint": { kind: "lint", note: "Use comark-linter." },
} satisfies Record<string, Mapping>;
export const PLUGINS: Record<string, Mapping> = plugins;

const PACKAGE = /^(?:@[\w.-]+\/)?[\w.-]+(?:\/[\w.-]+)?$/;

/**
 * The Comark counterpart of a plugin by its package name. A relative or aliased path, or a name that isn't an
 * import, is the project's own code.
 */
export function mapPlugin(name: string, imported = true): Mapping & { known: boolean } {
  const base = name.replace(/\/(mdx|lib)$/, "");
  const ui = UI.get(base);
  if (PLUGINS[base] || ui) {
    const mapping =
      PLUGINS[base] ??
      unsupported(
        "No exact counterpart; the comark-ui package does the same job with its own markup.",
      );
    const found = { ...mapping };
    if (ui) found.ui = ui;
    return { ...found, known: true };
  }
  if (/^remark-(lint|preset-lint)/.test(base))
    return { kind: "lint", note: "Use comark-linter.", known: true };
  if (!imported || !PACKAGE.test(base) || /^[~@]\//.test(base) || base.startsWith(".")) {
    return {
      kind: "custom",
      note: "The project's own plugin: port it to a Comark plugin and check it with the harness on the project's content.",
      known: true,
    };
  }
  return {
    ...unsupported(
      "it isn't in the plugin map yet; its own test fixtures are the spec for a port.",
    ),
    known: false,
  };
}
