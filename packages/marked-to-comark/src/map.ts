/**
 * What each marked option, extension, or override becomes on Comark.
 *
 * - `pipeline`: part of calling marked; `renderHtml` replaces it.
 * - `setup`: covered by `comarkSetup()`; `setting` is what to pass it, if anything.
 * - `builtin`: Comark does it without a plugin.
 * - `plugin`: a Comark plugin does the same job; `use` is the import and `call` the expression.
 * - `port`: this package ships a Comark version with the same options and output; `use` points at it.
 * - `custom`: the project's own code (a renderer, a tokenizer, an extension it wrote); it needs porting by hand.
 * - `unsupported`: no counterpart yet; the note says what to do.
 */
export type MappingKind =
  | "pipeline"
  | "setup"
  | "builtin"
  | "plugin"
  | "port"
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
  /** What `comarkOptions()` takes for it, such as `breaks: true`. */
  setting?: string;
  note?: string;
  /** The comark-ui package for the same feature, styled and themed, when there is one; its markup differs. */
  ui?: string;
}

const UI_DOCS = "https://comark-ui.onmax.me";

/** The comark-ui docs page for a package, such as `comark-links` → https://comark-ui.onmax.me/links/. */
export const uiDocs = (name: string) =>
  `${UI_DOCS}/${name === "comark-mathml" ? "math" : name.replace(/^comark-/, "")}/`;

const pipeline = (note?: string): Mapping => ({ kind: "pipeline", note });
const setup = (note: string, setting?: string): Mapping => ({ kind: "setup", note, setting });
const builtin = (note: string): Mapping => ({ kind: "builtin", note });
const plugin = (name: string, from: string, call: string, note?: string, ui?: string): Mapping => ({
  kind: "plugin",
  use: { name, from },
  call,
  note,
  ui,
});
const unsupported = (note: string): Mapping => ({ kind: "unsupported", note });
const custom = (note: string): Mapping => ({ kind: "custom", note });

const highlight = {
  ...plugin(
    "highlight",
    "comark/plugins/highlight",
    "highlight()",
    "Comark highlights code with Shiki; the highlighter function and its classes don't carry over, so check the styles.",
    "comark-code",
  ),
};
const math = {
  ...plugin(
    "math",
    "@comark/html/plugins/math",
    "math()",
    "KaTeX renders through the `Math` component; KaTeX options go in `math({ options })`.",
    "comark-mathml",
  ),
  component: "Math",
};

const EXTENSIONS = new Map<string, Mapping>(
  Object.entries({
    "marked-highlight": {
      kind: "port",
      use: { name: "markedHighlight", from: "marked-to-comark/plugins", named: true },
      call: "markedHighlight($options)",
      note: "`markedHighlight()` from marked-to-comark/plugins takes the same options and runs your highlighter, so the markup stays as it was.",
      ui: "comark-code",
    },
    "marked-shiki": highlight,
    "marked-gfm-heading-id": setup(
      "Comark gives headings ids with `headingIds: true`; its slugs keep Unicode letters like marked-gfm-heading-id's, but differ on some punctuation.",
      "headingIds: true",
    ),
    "marked-custom-heading-id": builtin("`# Title {#id}` is Comark attribute syntax."),
    "marked-footnote": plugin(
      "footnotes",
      "comark/plugins/footnotes",
      "footnotes()",
      "Comark's footnotes markup differs from marked-footnote's; check styles.",
      "comark-footnotes",
    ),
    "marked-katex-extension": math,
    "marked-extended-latex": math,
    "marked-alert": plugin("alert", "comark/plugins/alert", "alert()", undefined, "comark-github"),
    "marked-emoji": plugin(
      "emoji",
      "comark/plugins/emoji",
      "emoji()",
      "Comark's emoji plugin has its own shortcode list; marked-emoji's `emojis` map doesn't carry over.",
    ),
    "marked-smartypants": plugin("punctuation", "comark/plugins/punctuation", "punctuation()"),
    "marked-smartypants-lite": plugin("punctuation", "comark/plugins/punctuation", "punctuation()"),
    "marked-linkify-it": builtin(
      "Comark links URLs itself, like GFM; it doesn't link bare domains such as `example.com` the way linkify-it's fuzzy mode does.",
    ),
    "marked-mangle": setup(
      "Comark writes email links as plain text; marked-mangle only hid them behind entities.",
    ),
    "marked-xhtml": builtin("Comark writes HTML; `<br>` and `<br/>` read the same in a browser."),
    "marked-directive": builtin(
      "Directives become Comark components (`:::name`); check their markup.",
    ),
    "marked-admonition-extension": plugin(
      "alert",
      "comark/plugins/alert",
      "alert()",
      "Admonitions become GitHub alerts or Comark components.",
    ),
    "marked-mermaid": {
      ...plugin("mermaid", "@comark/html/plugins/mermaid", "mermaid()"),
      component: "Mermaid",
      ui: "comark-diagrams",
    },
    "marked-base-url": unsupported(
      "Resolve relative links before parsing, or after with a Comark `post` hook over `state.tree`.",
    ),
    "marked-extended-tables": unsupported(
      "Comark tables have no colspan or rowspan syntax; write those tables as HTML.",
    ),
    "marked-terminal": unsupported(
      "Comark renders to the terminal with its own ANSI renderer; marked-terminal's options don't carry over.",
    ),
    "marked-man": unsupported("Man pages are outside Comark."),
    "marked-plaintify": unsupported(
      "Strip Markdown to text with `renderMarkdown` or by walking Comark's tree.",
    ),
    "marked-react": unsupported("Render with @comark/react's `<Markdown>` instead."),
    "marked-sanitizer-github": {
      kind: "plugin",
      use: { name: "html", from: "comark-github", named: true },
      call: "html()",
      note: "comark-github's `html()` prunes raw HTML to GitHub's allowlist.",
    },
  }),
);

/** The Comark counterpart of a marked extension by its package name; anything else is the project's own code. */
export function mapExtension(name: string, imported = true): Mapping & { known: boolean } {
  const mapping = EXTENSIONS.get(name.replace(/\/(lib|dist)(\/.*)?$/, ""));
  if (mapping) return { ...mapping, known: true };
  if (
    !imported ||
    name.startsWith(".") ||
    /^[~@#]\//.test(name) ||
    !/^(?:@[\w.-]+\/)?[\w.-]+(?:\/[\w.-]+)*$/.test(name)
  )
    return {
      ...custom(
        "The project's own extension. Port it to a Comark plugin and compare its output with marked's on the project's content.",
      ),
      known: true,
    };
  return {
    ...unsupported("it isn't in the extension map yet; its own tests are the spec for a port."),
    known: false,
  };
}

const literal = (value: string | undefined) => (value === undefined ? undefined : value.trim());

/** What a marked option becomes, given the source text of its value. */
export function mapOption(name: string, value: string | undefined): Mapping & { known: boolean } {
  const v = literal(value);
  const known = (mapping: Mapping) => ({ ...mapping, known: true });
  const computed = v !== undefined && v !== "true" && v !== "false" && !/^["'`]/.test(v);
  switch (name) {
    case "gfm":
      if (computed)
        return known(
          custom("`gfm` is set in code; pass `gfm` to `comarkOptions()` with the same value."),
        );
      return known(
        v === "false"
          ? setup(
              "Plain CommonMark: no tables, strikethrough, task lists, or autolinks.",
              "gfm: false",
            )
          : setup("GFM is Comark's default."),
      );
    case "breaks":
      if (computed)
        return known(
          custom(
            "`breaks` is set in code; pass `breaks` to `comarkOptions()` with the same value.",
          ),
        );
      return known(
        v === "true"
          ? setup("Single line breaks become `<br>`.", "breaks: true")
          : setup("Comark keeps single line breaks as spaces, like marked's default."),
      );
    case "pedantic":
      return known(
        v === "false"
          ? setup("marked's default.")
          : unsupported(
              "Comark has no mode for the original markdown.pl quirks; content that relies on them renders differently.",
            ),
      );
    case "async":
      return known(pipeline("`renderHtml` always returns a promise."));
    case "silent":
      return known(pipeline("Comark never throws on Markdown; problems go in `meta.issues`."));
    case "headerIds":
      if (v === "false")
        return known(
          setup("Comark writes no heading ids with `comarkOptions()`, like marked 8 and later."),
        );
      return known(
        setup(
          "marked before v8 gave every heading an id; `headerIds: true` writes the same ids with marked's slugger.",
          "headerIds: true",
        ),
      );
    case "headerPrefix":
      if (v && /^(["'])[^"'\\]*\1$/.test(v))
        return known(setup("The prefix goes before each heading id.", `headerPrefix: ${v}`));
      return known(
        custom("`headerPrefix` is set in code; pass it to `comarkOptions()` as `headerPrefix`."),
      );
    case "mangle":
      return known(
        setup("Comark writes email links as plain text; mangle only hid them behind entities."),
      );
    case "sanitize":
      if (v === "false") return known(setup("marked's default."));
      return known(
        unsupported(
          "marked showed raw HTML as text; Comark either keeps it or, with `html: false`, drops it. For untrusted input, add Comark's security plugin and keep sanitizing the HTML (DOMPurify).",
        ),
      );
    case "sanitizer":
      return known(
        custom("A sanitizer function; run it, or DOMPurify, on the HTML Comark renders."),
      );
    case "smartypants":
      if (v === "false") return known(setup("marked's default."));
      return known(plugin("punctuation", "comark/plugins/punctuation", "punctuation()"));
    case "smartLists":
    case "tables":
      return known(setup("Comark reads lists and tables as marked's defaults do."));
    case "xhtml":
      return known(builtin("Comark writes HTML; `<br>` and `<br/>` read the same in a browser."));
    case "langPrefix":
      if (v && /^(["'])[^"'\\]*\1$/.test(v))
        return known(setup("The class before a code block's language.", `langPrefix: ${v}`));
      return known(
        custom("`langPrefix` is set in code; pass it to `comarkOptions()` as `langPrefix`."),
      );
    case "highlight":
      return known({
        ...highlight,
        kind: "custom",
        note: "A highlight function; Comark's `highlight()` from comark/plugins/highlight highlights with Shiki instead. Check the styles.",
      });
    case "baseUrl":
      return known(
        unsupported(
          "Resolve relative links before parsing, or after with a Comark `post` hook over `state.tree`.",
        ),
      );
  }
  return { ...unsupported("it isn't a marked option the map knows."), known: false };
}

// The Comark element each renderer method draws, for overrides that only change how one element looks.
const ELEMENTS = new Map(
  Object.entries({
    link: "a",
    image: "img",
    heading: "h1`–`h6",
    code: "pre",
    codespan: "code",
    paragraph: "p",
    blockquote: "blockquote",
    list: "ul`/`ol",
    listitem: "li",
    table: "table",
    tablerow: "tr",
    tablecell: "td`/`th",
    strong: "strong",
    em: "em",
    del: "del",
    br: "br",
    hr: "hr",
    checkbox: "input",
  }),
);

/** What overriding a part of marked becomes: the project's own code, ported by hand. */
export function mapOverride(name: string, methods?: string[]): Mapping & { known: boolean } {
  const drawn = (methods ?? []).filter((method) => ELEMENTS.has(method));
  const rest = (methods ?? []).filter((method) => !ELEMENTS.has(method));
  const notes = new Map(
    Object.entries({
      renderer: drawn.length
        ? `Custom renderer methods (${methods!.join(", ")}). Draw ${drawn.map((method) => `\`${ELEMENTS.get(method)}\``).join(", ")} with Comark components (\`components\` in @comark/html, or your framework's renderer)${rest.length ? `, and do what ${rest.join(", ")} did in a \`post\` hook over \`state.tree\`` : ""}.`
        : "Custom renderer methods. Draw those elements with Comark components (`components: { a: … }` in @comark/html) or a `post` hook over `state.tree`.",
      tokenizer: `Custom tokenizer methods${methods?.length ? ` (${methods.join(", ")})` : ""} change what marked parses. Port them to a markdown-it plugin through Comark's plugin API.`,
      walkTokens:
        "A `walkTokens` callback. Do the same in a Comark plugin's `post` hook, walking `state.tree.nodes`.",
      hooks:
        "marked hooks. Use a Comark plugin's `pre` hook for `preprocess` and edit the HTML `renderHtml` returns for `postprocess`.",
      extensions:
        "The project's own marked extensions. Port each to a Comark plugin (a markdown-it rule plus a component).",
      options: "Options held in code the scan can't follow.",
    }),
  );

  return { ...custom(notes.get(name) ?? notes.get("options")!), known: true };
}
