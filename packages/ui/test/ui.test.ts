import { createHtmlRenderer } from "@comark/html";
import { MarkdownDocument as ReactDocument } from "@comark/react";
import { MarkdownDocument as VueDocument } from "@comark/vue";
import { parseMarkdown } from "comark";
import { createElement } from "react";
import { renderToString as renderReact } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";
import { createSSRApp, h } from "vue";
import { renderToString as renderVue } from "vue/server-renderer";
import html, { type PresetOptions } from "../src/html.ts";
import react from "../src/react.ts";
import vue from "../src/vue.ts";

// No downloads and no Kroki, so the tests stay offline.
const offline: PresetOptions = {
  chips: { download: false },
  badge: { download: false },
  icon: { fetch: false },
  diagrams: { draw: false },
};
const document = [
  "> [!TIP]\n> Read this.",
  "Released :badge[New]",
  "::steps\n### Install\nRun it.\n::",
  "::code-group\n```sh [pnpm]\npnpm add x\n```\n```sh [npm]\nnpm i x\n```\n::",
  "![A cat](/cat.png)",
  "![Demo](demo.mp4)",
  '::card{title="Docs" to="/guide"}\nRead it.\n::',
  "```csv\nBird,Seen\nHeron,2\n```",
  "Ducks{++ and geese++}.",
  "```mermaid\nflowchart LR\n  Draft --> Review\n```",
].join("\n\n");

const blocks = [
  'class="cgc"',
  'class="cs"',
  'class="ct"',
  'class="ck"',
  "data-zoom",
  'class="ccr"',
  'class="cb"',
  // comark-media adds the kind, as in `cm cm-video`.
  'class="cm ',
  "<table",
  'class="ccm-ins"',
  // comark-pele draws the fence as an SVG on the server.
  '<svg xmlns="http://www.w3.org/2000/svg" class="pele pele-flowchart"',
];

describe("comark-ui", () => {
  it("renders every plugin's blocks with one install", async () => {
    const { plugins, components } = html(offline);
    const out = await createHtmlRenderer({ plugins, components })(document);
    for (const block of blocks) expect(out).toContain(block);
  });

  it("passes hosted badge options through each preset", async () => {
    for (const preset of [html, vue, react]) {
      const { plugins } = preset({
        ...offline,
        badge: { endpoint: "https://example.com/badge.svg", download: false },
      });
      const document = await parseMarkdown(':badge{source="npm-version" package="comark-ui"}', {
        plugins,
      });
      expect(JSON.stringify(document.nodes)).toContain("https://example.com/badge.svg?");
    }
  });

  it("turns a plugin off, with its components", async () => {
    const { plugins, components } = html({ ...offline, zoom: false, github: { callouts: false } });
    expect(Object.keys(components)).not.toContain("zoom");
    expect(Object.keys(components)).not.toContain("github-callout");
    const out = await createHtmlRenderer({ plugins, components })(document);
    expect(out).not.toContain("data-zoom");
    expect(out).not.toContain('class="cgc"');
  });

  it("themes Mermaid diagrams once per document, and turns them off", async () => {
    const markdown =
      "```mermaid\nsequenceDiagram\n  A->>B: Hi\n```\n\n```mermaid\nflowchart LR\n  A --> B\n```";
    const out = await createHtmlRenderer(html(offline))(markdown);
    expect(out.match(/<style data-comark-mermaid>/g)).toHaveLength(1);
    expect(out).toContain(":where(:root){--_comark-background:var(--comark-background");
    expect(out).toContain(":where(:root){--pele-bg:var(--_comark-background)");
    expect(out).toContain("--pele-fg:var(--_comark-foreground)");
    expect(out).toContain('data-diagram="sequence"');
    // A wide block with its own width, so a page that gives wide blocks room shows it at its size.
    expect(out).toMatch(
      /<div class="pele-diagram" data-wide style="--cmm-svg:\d+px" data-diagram="flowchart">/,
    );
    const off = await createHtmlRenderer(html({ ...offline, mermaid: false }))(markdown);
    expect(off).not.toContain("pele-diagram");
    expect(off).toContain('class="language-mermaid"');
  });

  it("styles the text by default, scoped to the element the document renders into", async () => {
    const markdown = "# Title\n\nSome `code`.\n\n| A | B |\n| - | - |\n| 1 | 2 |";
    const out = await createHtmlRenderer(html(offline))(markdown);
    expect(out.match(/<style data-comark-typeset>/g)).toHaveLength(1);
    // The styles come last, so the first heading is still the first child and adds no space above.
    expect(out.trimEnd()).toMatch(/<style data-comark-typeset>[^<]*<\/style>$/);
    const css = out.slice(out.indexOf("<style data-comark-typeset>"));
    // Under every block's rules, which sit in `comark` itself, and on the tokens shared with them.
    expect(css).toContain("@layer comark{@layer typeset{@scope{");
    expect(css).toContain(
      ":where(:scope){--_comark-background:var(--comark-background,var(--ui-bg,var(--background",
    );
    expect(css).toContain("color:var(--_comark-foreground)");
    expect(css).toContain("calc(var(--typeset-size,1em) * 1.125)");
    // The grain, on the document's own background, which `--comark-grain: none` turns off.
    expect(css).toContain('background-image:var(--comark-grain,url("data:image/svg+xml,');
    expect(css).toContain("feTurbulence type='fractalNoise' baseFrequency='0.9'");
    expect(css).not.toContain("/*");
    // Wide blocks grow only into the room the page gives them.
    expect(css).toContain(
      ":scope>[data-wide]{--_ty-wide:max(100%,min(var(--comark-wide-width,100vw),var(--comark-wide-max,72rem),var(--comark-wide-room,100%)));",
    );
    const off = await createHtmlRenderer(html({ ...offline, typeset: false }))(markdown);
    expect(off).not.toContain("data-comark-typeset");
    expect(Object.keys(html({ ...offline, typeset: false }).components)).not.toContain(
      "typeset-styles",
    );
  });

  it("includes files only when asked", async () => {
    const read = (path: string) => (path === "note.md" ? "Pasted." : undefined);
    const markdown = ':include{src="note.md"}';
    const off = await createHtmlRenderer(html(offline))(markdown);
    expect(off).not.toContain("Pasted.");
    const on = await createHtmlRenderer(html({ ...offline, include: { read } }))(markdown);
    expect(on).toContain("Pasted.");
  });

  it("adds the side outline only when asked", async () => {
    const markdown = "## Install\n\n## Usage";
    expect(await createHtmlRenderer(html(offline))(markdown)).not.toContain("cto-rail");
    for (const preset of [html, vue, react]) {
      const { plugins } = preset({ ...offline, outline: { rail: true } });
      const { nodes } = await parseMarkdown(markdown, { plugins });
      expect(nodes.some((node) => Array.isArray(node) && node[0] === "toc-rail")).toBe(true);
    }
  });

  it("reads a table's file only when given a reader", async () => {
    const read = (path: string) => (path === "birds.csv" ? "Bird,Seen\nHeron,2" : undefined);
    const markdown = '::table{src="birds.csv"}\n::';
    const off = await createHtmlRenderer(html(offline))(markdown);
    expect(off).not.toContain("Heron");
    const on = await createHtmlRenderer(html({ ...offline, table: { read } }))(markdown);
    expect(on).toContain("Heron");
  });

  it("renders the same blocks in Vue and React", async () => {
    for (const [name, preset, render] of [
      [
        "vue",
        vue(offline),
        (value: never, components: never) =>
          renderVue(createSSRApp({ render: () => h(VueDocument, { value, components }) })),
      ],
      [
        "react",
        react(offline),
        (value: never, components: never) =>
          renderReact(createElement(ReactDocument, { value, components })),
      ],
    ] as const) {
      const value = await parseMarkdown(document, { plugins: preset.plugins });
      const out = await render(value as never, preset.components as never);
      for (const block of blocks) expect(out, name).toContain(block);
      // In the server's HTML, unescaped, so the page arrives styled.
      expect(out, name).toContain("<style data-comark-typeset");
      expect(out, name).toContain("@scope{:where(:scope){");
      expect(out, name).toContain(":scope>:where(:first-child)");
    }
  });
});
