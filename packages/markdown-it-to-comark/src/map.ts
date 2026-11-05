/**
 * What each markdown-it plugin becomes on Comark.
 *
 * - `setup`: covered by `comarkSetup()` and its options.
 * - `bridge`: runs as it is through `markdownItPlugin()` from markdown-it-to-comark/plugins, renderer rules and all;
 *   the lab renders it both ways on real projects.
 * - `plugin`: a Comark plugin does the same job; `use` is the import and `call` the expression.
 * - `custom`: the project's own plugin, or an expression the scan can't follow; `markdownItPlugin()` can still run it,
 *   but nobody has compared its output on Comark.
 * - `unsupported`: no counterpart; the note says what to do.
 */
export type MappingKind = "setup" | "bridge" | "plugin" | "custom" | "unsupported";

export interface Mapping {
  kind: MappingKind;
  /** `import x from "y"` for the Comark counterpart, with `x` as the local name. */
  use?: { name: string; from: string; named?: boolean };
  /** The plugin expression; `$options` is replaced with the original options when there are any. */
  call?: string;
  note?: string;
  /** The comark-ui package for the same feature, styled and themed, when there is one; its markup differs. */
  ui?: string;
}

const UI_DOCS = "https://comark-ui.onmax.me";

/** The comark-ui docs page for a package, such as `comark-links` → https://comark-ui.onmax.me/links. */
export const uiDocs = (name: string) =>
  `${UI_DOCS}/${name === "comark-mathml" ? "math" : name.replace(/^comark-/, "")}`;

// comark-ui packages that do what a markdown-it plugin does, by plugin.
const UI = new Map(
  Object.entries({
    "markdown-it-footnote": "comark-footnotes",
    "markdown-it-anchor": "comark-links",
    "markdown-it-link-attributes": "comark-links",
    "markdown-it-table-of-contents": "comark-outline",
    "markdown-it-toc-done-right": "comark-outline",
    "markdown-it-toc-and-anchor": "comark-outline",
    "markdown-it-katex": "comark-mathml",
    "@vscode/markdown-it-katex": "comark-mathml",
    "@traptitech/markdown-it-katex": "comark-mathml",
    "markdown-it-texmath": "comark-mathml",
    "markdown-it-mathjax3": "comark-mathml",
    "markdown-it-github-alerts": "comark-github",
    "markdown-it-deflist": "comark-deflist",
    "markdown-it-mark": "comark-mark",
    "markdown-it-ins": "comark-mark",
    "markdown-it-sub": "comark-mark",
    "markdown-it-sup": "comark-mark",
    "markdown-it-kbd": "comark-keys",
    "markdown-it-container": "comark-details",
    "markdown-it-multimd-table": "comark-table",
    "markdown-it-implicit-figures": "comark-figure",
  }),
);

const bridge = (note?: string): Mapping => ({
  kind: "bridge",
  use: { name: "markdownItPlugin", from: "markdown-it-to-comark/plugins", named: true },
  note,
});
const setup = (note: string): Mapping => ({ kind: "setup", note });
const unsupported = (note: string): Mapping => ({ kind: "unsupported", note });

const plugins = {
  "markdown-it": setup("The parser itself; `comarkOptions()` reads Markdown the way it does."),
  "markdown-it-container": bridge(
    "`::: name` blocks keep their markup, renderer included. Comark's own components (`::name`) read differently, so the content codemod leaves the containers alone.",
  ),
  "markdown-it-footnote": bridge(),
  "markdown-it-sub": bridge(),
  "markdown-it-sup": bridge(),
  "markdown-it-mark": bridge(),
  "markdown-it-ins": bridge(),
  "markdown-it-abbr": bridge(),
  "markdown-it-deflist": bridge(),
  "markdown-it-anchor": bridge(
    "Its ids replace Comark's, which slugify differently; permalinks render as the plugin writes them.",
  ),
  "markdown-it-attrs": bridge(
    "Comark's own attribute syntax is close (`{.class #id key=value}`); with the bridge, the plugin's own rules apply.",
  ),
  "markdown-it-task-lists": bridge(),
  "markdown-it-emoji": bridge(
    "With Comark's component syntax on, `:name` reads as a component unless the plugin claims it first; the content codemod leaves shortcodes alone.",
  ),
  "markdown-it-table-of-contents": bridge(),
  "markdown-it-toc-done-right": bridge(),
  "markdown-it-texmath": bridge("KaTeX renders while parsing, as with markdown-it."),
  "markdown-it-katex": bridge("KaTeX renders while parsing, as with markdown-it."),
  "@vscode/markdown-it-katex": bridge("KaTeX renders while parsing, as with markdown-it."),
  "@traptitech/markdown-it-katex": bridge("KaTeX renders while parsing, as with markdown-it."),
  "markdown-it-highlightjs": bridge(
    "Highlighting runs in the fence renderer, as with markdown-it.",
  ),
  "markdown-it-prism": bridge("Highlighting runs in the fence renderer, as with markdown-it."),
  "markdown-it-link-attributes": bridge(),
  "markdown-it-multimd-table": bridge(),
  "markdown-it-github-alerts": bridge(),
  "markdown-it-imsize": bridge(),
  "markdown-it-for-inline": bridge(),
  "markdown-it-image-lazy-loading": bridge(),
  "markdown-it-front-matter": setup(
    "`comarkOptions({ frontmatter: true })` reads the block into `document.frontmatter`; the plugin's callback has no counterpart.",
  ),
  "markdown-it-async": unsupported(
    "Comark renders asynchronously already; register the plugins it wraps with `markdownItPlugin()` instead.",
  ),
  "@shikijs/markdown-it": {
    kind: "plugin",
    use: { name: "highlight", from: "comark/plugins/highlight" },
    call: "highlight()",
    note: "Shiki highlighting. Theme options differ: pass Shiki theme registrations as `themes: { light, dark }`.",
  },
  "markdown-it-include": unsupported(
    "Comark has no file access while parsing; inline the file or resolve includes before parsing.",
  ),
} satisfies Record<string, Mapping>;
export const PLUGINS: Record<string, Mapping> = plugins;

const PACKAGE = /^(?:@[\w.-]+\/)?[\w.-]+(?:\/[\w.-]+)?$/;

/**
 * The Comark counterpart of a markdown-it plugin by its package name. A relative or aliased path, or a name that
 * isn't an import, is the project's own code.
 */
export function mapPlugin(name: string, imported = true): Mapping & { known: boolean } {
  const base = name.replace(/\/(dist|lib|index)(\.[cm]?js)?$/, "");
  const ui = UI.get(base);
  const mapping = PLUGINS[base];
  if (mapping) {
    const found: Mapping & { known: boolean } = { ...mapping, known: true };
    if (ui) found.ui = ui;
    return found;
  }
  if (!imported || !PACKAGE.test(base) || /^[~@#]\//.test(base) || base.startsWith(".")) {
    return {
      ...bridge(
        "The project's own plugin. `markdownItPlugin()` runs it, renderer rules included; compare its output on a few of the project's pages.",
      ),
      kind: "custom",
      known: true,
    };
  }
  const unknown: Mapping & { known: boolean } = {
    ...bridge(
      "It isn't in the plugin map yet, so its output on Comark hasn't been compared; `markdownItPlugin()` runs it, renderer rules included.",
    ),
    kind: "custom",
    known: false,
  };
  if (ui) unknown.ui = ui;
  return unknown;
}
