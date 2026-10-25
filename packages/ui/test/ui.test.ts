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
        badge: { endpoint: "https://example.com/badge.svg" },
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
    const off = await createHtmlRenderer(html({ ...offline, mermaid: false }))(markdown);
    expect(off).not.toContain("pele-diagram");
    expect(off).toContain('class="language-mermaid"');
  });

  it("includes files only when asked", async () => {
    const read = (path: string) => (path === "note.md" ? "Pasted." : undefined);
    const markdown = ':include{src="note.md"}';
    const off = await createHtmlRenderer(html(offline))(markdown);
    expect(off).not.toContain("Pasted.");
    const on = await createHtmlRenderer(html({ ...offline, include: { read } }))(markdown);
    expect(on).toContain("Pasted.");
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
    }
  });
});
