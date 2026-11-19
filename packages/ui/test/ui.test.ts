import { fileURLToPath } from "node:url";
import { createHtmlRenderer } from "@comark/html";
import { MarkdownDocument as ReactDocument } from "@comark/react";
import { MarkdownDocument as VueDocument } from "@comark/vue";
import { createSerializedMarkdownParser, parseMarkdown, type MarkdownDocument } from "comark";
import { createElement } from "react";
import { renderToString as renderReact } from "react-dom/server";
import type { LanguageRegistration } from "shiki";
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import dark from "shiki/themes/github-dark.mjs";
import light from "shiki/themes/github-light.mjs";
import { build, type Rolldown } from "vite";
import { describe, expect, it, vi } from "vite-plus/test";
import { createSSRApp, h, type Component } from "vue";
import { renderToString as renderVue } from "vue/server-renderer";
import html, { mermaidScript, type PresetOptions } from "../src/html.ts";
import react from "../src/react.ts";
import vue, { components as vueComponents } from "../src/vue.ts";
import { components as lazyComponents } from "../src/vue-lazy.ts";

// No downloads and no Kroki, so the tests stay offline.
const offline: PresetOptions = {
  chips: { download: false },
  badge: { download: false },
  icon: { fetch: false },
  diagrams: { draw: false },
};
const renderHtml = (markdown: string, options: PresetOptions = {}) =>
  createHtmlRenderer(html({ ...offline, ...options }))(markdown);
it("preserves git-graph source fences owned by a diff", async () => {
  const markdown =
    '::diff{file="history.log"}\n```git-graph\n* bbbbbbb aaaaaaa (HEAD -> main) Before change\n* aaaaaaa Initial commit\n```\n```git-graph\n* bbbbbbb aaaaaaa (HEAD -> main) After change\n* aaaaaaa Initial commit\n```\n::';
  const options = html(offline);
  const parsed = await parseMarkdown(markdown, options);
  expect(parsed.meta.issues ?? []).toEqual([]);
  const output = await renderHtml(markdown);
  expect(output).toContain('class="cd-added">+1</span>');
  expect(output).toContain('class="cd-removed">−1</span>');
  expect(output.match(/<tr class="cd-del"/g)).toHaveLength(1);
  expect(output.match(/<tr class="cd-add"/g)).toHaveLength(1);
  expect(output.match(/<tr class="cd-same"/g)).toHaveLength(1);
  expect(output).toContain("Before");
  expect(output).toContain("After");
  expect(output).toContain("Initial commit");
});

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
  it("draws the links in the properties box as chips, like the document's own", async () => {
    const output = await renderHtml(
      "---\npr: https://example.com/acme/app/pull/7\ntags: [docs, https://example.com/spec]\n---\n\nSee [the spec](https://example.com/spec).",
      { chips: { download: false, favicon: (host) => `https://icons.example/${host}` } },
    );
    const box = output.slice(output.indexOf('<dl class="cfm"'), output.indexOf("</dl>"));
    expect(box).toContain(
      '<a class="cp" href="https://example.com/acme/app/pull/7" data-kind="favicon">',
    );
    expect(box).toContain('src="https://icons.example/example.com"');
    expect(box).toMatch(/<span class="cfm-tag">\s*docs\s*<\/span>/);
    expect(box).not.toMatch(/cfm-tag">\s*<a/);
  });

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

  it("keeps a reference that is a chip's label as text, so no link holds another", async () => {
    const out = await renderHtml(
      "See [comarkdown/comark#525](https://github.com/comarkdown/comark/issues/525).",
      { github: { references: { repo: "onmax/comark-ui" } } },
    );
    expect(out).toContain('class="cp"');
    expect(out.match(/<a /g)).toHaveLength(1);
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
    const out = await renderHtml(markdown);
    expect(out.match(/<style data-comark-mermaid>/g)).toHaveLength(1);
    expect(out).toContain(":where(:root){--_comark-background:var(--comark-background");
    expect(out).toContain(":where(:root){--pele-bg:var(--_comark-background)");
    expect(out).toContain("--pele-fg:var(--_comark-foreground)");
    expect(out).toContain('data-diagram="sequence"');
    // A wide block with its own width, so a page that gives wide blocks room shows it at its size.
    expect(out).toMatch(
      /<div class="cmm" data-comark-frame data-wide style="--cmm-svg:\d+px" data-source="flowchart LR/,
    );
    const off = await renderHtml(markdown, { mermaid: false });
    expect(off).not.toContain("pele-diagram");
    expect(off).toContain('class="language-mermaid"');
  });

  it("zooms a Mermaid diagram and gives it Copy image and Copy source, with one script per document", async () => {
    const markdown =
      '```mermaid\nflowchart LR\n  A -->|"a & b"| B\n```\n\n```mermaid\nflowchart TD\n  C --> D\n```';
    const out = await renderHtml(markdown);
    // The card zooms, and the bar sits beside it in the wrapper, so a click on a button never opens the zoom.
    expect(out.match(/<div data-zoom tabindex="0" class="pele-diagram"/g)).toHaveLength(2);
    expect(
      out.match(/<\/svg><\/div><div class="cmm-bar"><button type="button" class="cmm-image"/g),
    ).toHaveLength(2);
    expect(out).toContain('aria-label="Copy source"');
    expect(out).toContain('<span class="cmm-status" role="status"></span>');
    // The source the buttons copy, escaped for the attribute.
    expect(out).toContain('data-source="flowchart LR\n  A --&gt;|&quot;a &amp; b&quot;| B\n"');
    // One script for the buttons and one for zoom, and the buttons' script is the exported text, on every render.
    expect(out.split(`<script>${mermaidScript}</script>`)).toHaveLength(2);
    expect(out.match(/<style data-comark-zoom>/g)).toHaveLength(1);
    expect(await renderHtml(markdown)).toContain(`<script>${mermaidScript}</script>`);
    expect(mermaidScript).toMatch(/^\(function\b[^(]*\(\) \{[\s\S]*\}\)\(\)$/);
    expect(mermaidScript).not.toContain("</");

    const still = await renderHtml(markdown, { zoom: false });
    expect(still).not.toContain("data-zoom");
    expect(still).not.toContain("data-comark-zoom");
    expect(still.match(/class="cmm-bar"/g)).toHaveLength(2);
    expect(still).toContain(`<script>${mermaidScript}</script>`);
  });

  it("shows the Mermaid diagrams past a document's limits as code, each with an issue", async () => {
    const fence = (body: string) => `\`\`\`mermaid\nflowchart LR\n  ${body}\n\`\`\``;
    const markdown = [fence("A --> B"), fence("C --> D"), fence("E --> F")].join("\n\n");
    const preset = html({ ...offline, mermaid: { maxDiagrams: 2 } });
    const tree = await parseMarkdown(markdown, { plugins: preset.plugins });
    expect(tree.meta.issues).toEqual([
      "Mermaid diagram 3 shows its source as code, because a document draws at most 2 Mermaid diagrams. Move it to another document.",
    ]);
    const out = await createHtmlRenderer(preset)(markdown);
    expect(out.match(/class="pele-diagram"/g)).toHaveLength(2);
    expect(out).toContain('class="ck"');
    expect(out).toContain("E --&gt; F");

    const long = fence(`A --> ${"B".repeat(40)}`);
    const limited = html({ ...offline, mermaid: { maxSource: 40 } });
    const short = await parseMarkdown(`${long}\n\n${fence("C --> D")}`, {
      plugins: limited.plugins,
    });
    expect(short.meta.issues).toEqual([
      "Mermaid diagram 1 shows its source as code, because a document draws at most 40 characters of Mermaid. Shorten it or move it to another document.",
    ]);
    expect(short.meta.issueRules).toEqual({
      [short.meta.issues[0]]: "comark/mermaid/source-too-long",
    });
    expect(JSON.stringify(short.nodes)).toContain('["pele",');
  });

  it("highlights code with the host's Shiki, within a document's limits", async () => {
    // The host's own Shiki, as on a Worker: no WebAssembly, each grammar loaded the first time a fence asks for it.
    const shiki = await createHighlighterCore({
      themes: [light, dark],
      langs: [],
      engine: createJavaScriptRegexEngine(),
    });
    const grammars: Record<string, () => Promise<{ default: LanguageRegistration[] }>> = {
      ts: () => import("shiki/langs/typescript.mjs"),
      json: () => import("shiki/langs/json.mjs"),
    };
    const asked: string[] = [];
    const highlighter = async (language: string) => {
      asked.push(language);
      const grammar = grammars[language];
      if (!grammar) return undefined;
      await shiki.loadLanguage(...(await grammar()).default);
      return shiki;
    };
    const themes = { light: "github-light", dark: "github-dark" };
    const fence = (language: string, body: string) => `\`\`\`${language}\n${body}\n\`\`\``;
    const markdown = [
      fence("ts {2}", "const a = 1\nconst b = 2"),
      fence("txt", "plain"),
      fence("json", '{ "c": 3 }'),
      fence("ts", "const d = 4"),
    ].join("\n\n");

    const preset = html({ ...offline, shiki: { highlighter, themes, maxBlocks: 2 } });
    const tree = await parseMarkdown(markdown, { plugins: preset.plugins });
    expect(tree.meta.issues).toEqual([
      "Code block 4 shows without colors, because a document highlights at most 2 code blocks. Move it to another document.",
    ]);
    expect(tree.meta.issueRules).toEqual({
      [tree.meta.issues[0]]: "comark/shiki/too-many-blocks",
    });
    expect(asked).toEqual(["ts", "txt", "json"]);
    const out = await createHtmlRenderer(preset)(markdown);
    expect(out.match(/<pre[^>]*class="shiki"/g)).toHaveLength(2);
    expect(out).toContain("--shiki-dark:");
    // comark-code still marks the line `{2}` asks for, in the colored block.
    expect(out).toMatch(/<span class="line highlight[^"]*"[^>]*><span style="[^"]+">const/);
    expect(out).toContain("const d = 4");
    expect(out).toContain('class="ck"');

    const plain = await renderHtml(fence("ts", "const a = 1"), {
      code: false,
      shiki: { highlighter, themes },
    });
    expect(plain).toContain('class="shiki"');
    expect(plain).not.toContain("data-comark-code");
    expect(/<style data-comark-typeset>(.*?)<\/style>/s.exec(plain)?.[1]).toContain(
      '.shiki:where(.dark *) span[style*="--shiki-dark:"]{color:var(--shiki-dark)!important}',
    );

    asked.length = 0;
    const short = await parseMarkdown(`${fence("ts", "x".repeat(40))}\n\n${fence("ts", "y")}`, {
      plugins: html({ ...offline, shiki: { highlighter, themes, maxSource: 20 } }).plugins,
    });
    expect(short.meta.issues).toEqual([
      "Code block 1 shows without colors, because a document highlights at most 20 characters of code. Shorten it or move it to another document.",
    ]);
    expect(JSON.stringify(short.nodes)).toContain('"shiki"');
    expect(asked).toEqual(["ts"]);

    const failing = await parseMarkdown(fence("ts", "const e = 5"), {
      plugins: html({
        ...offline,
        shiki: { highlighter: () => Promise.reject(new Error("no grammar")), themes },
      }).plugins,
    });
    expect(failing.meta.issues ?? []).toEqual([]);
    expect(JSON.stringify(failing.nodes)).toContain("const e = 5");
  });

  it("skips grammar loading after exhausting either Shiki budget", async () => {
    for (const limits of [{ maxBlocks: 1 }, { maxSource: 1 }, { maxBlocks: 0 }, { maxSource: 0 }]) {
      const asked: string[] = [];
      const out = await renderHtml("```ts\nx\n```\n\n```json\ny\n```", {
        shiki: {
          ...limits,
          themes: { light: "light" },
          highlighter(language) {
            asked.push(language);
            return { codeToTokens: (code) => ({ tokens: [[{ content: code, color: "#000" }]] }) };
          },
        },
      });
      expect(asked).toEqual(Object.values(limits)[0] === 0 ? [] : ["ts"]);
      expect(out.match(/<pre[^>]*class="shiki"/g) ?? []).toHaveLength(asked.length);
    }
  });

  it("renders a Shiki fence with many short lines within its source budget", async () => {
    const source = Array.from({ length: 70_000 }, () => "x").join("\n");
    const out = await renderHtml(`\`\`\`ts\n${source}\n\`\`\``, {
      shiki: {
        maxSource: 200_000,
        themes: { light: "light" },
        highlighter: () => ({
          codeToTokens: (code) => ({
            tokens: code.split("\n").map((content) => [{ content, color: "#000" }]),
          }),
        }),
      },
    });
    expect(out).toContain('class="shiki"');
    expect(out.match(/class="line"/g)).toHaveLength(70_000);
  });

  it("keeps the source of a Mermaid diagram that fails, with nothing to zoom", async () => {
    const out = await renderHtml("```mermaid\nflowchart LR\n  A -->\n```");
    expect(out).toContain("data-error=");
    expect(out).toContain(
      '<div class="cmm" data-comark-frame data-source="flowchart LR\n  A --&gt;\n">',
    );
    expect(out).not.toContain("data-zoom");
    expect(out).not.toContain('class="cmm" data-wide');
  });

  it("styles the text by default, scoped to the element the document renders into", async () => {
    const markdown = "# Title\n\nSome `code`.\n\n| A | B |\n| - | - |\n| 1 | 2 |";
    const out = await renderHtml(markdown);
    expect(out.match(/<style data-comark-typeset>/g)).toHaveLength(1);
    // The styles come first, so a stream that adds blocks never replaces them.
    expect(out.trimStart()).toMatch(/^<style data-comark-typeset>[^<]*<\/style><h1/);
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
      ":is(:scope,:scope>.cr)>[data-wide],:scope>:is(h2,h3,h4,.cl-heading:has(>:is(h2,h3,h4))):has(+ .ca-compare,+ style + .ca-compare){--_ty-start:max(0px,var(--comark-wide-start,0px));--_ty-end:max(0px,var(--comark-wide-end,0px));",
    );
    const off = await renderHtml(markdown, { typeset: false });
    expect(off).not.toContain("data-comark-typeset");
    expect(Object.keys(html({ ...offline, typeset: false }).components)).not.toContain(
      "typeset-styles",
    );
  });

  it.each(["React", "Vue"] as const)(
    "keeps the typeset style first without mutating the %s streaming document",
    async (framework) => {
      const reactPreset = react(offline);
      const vuePreset = vue(offline);
      const { plugins } = framework === "React" ? reactPreset : vuePreset;
      const render = (value: MarkdownDocument, streaming: boolean) => {
        const props = { value, streaming, caret: true };
        return framework === "React"
          ? renderReact(
              createElement(ReactDocument, { ...props, components: { ...reactPreset.components } }),
            )
          : renderVue(
              createSSRApp(() =>
                h(VueDocument, { ...props, components: { ...vuePreset.components } }),
              ),
            );
      };
      const parse = createSerializedMarkdownParser({ plugins });
      const source = "# Plan\n\nFirst step.\n\n## Then\n\n- one\n- two\n\nLast words";
      let value;
      for (let start = 0; start < source.length; start += 4) {
        value = await parse(source.slice(0, start + 4), { streaming: true });
        expect(value.nodes.filter((node) => node[0] === "typeset-styles")).toHaveLength(1);
        expect(value.nodes[0]?.[0]).toBe("typeset-styles");
        expect(value.nodes.filter((node) => node === "")).toHaveLength(1);
      }
      if (!value) throw new Error("Expected a parsed document");
      const before = structuredClone(value.nodes);
      for (const streaming of [true, true, false]) {
        const out = await render(value, streaming);
        expect(out).toContain("<p>Last words</p>");
        expect(out.match(/animation:\s*pulse/g) ?? []).toHaveLength(streaming ? 1 : 0);
        expect(value.nodes).toEqual(before);
      }
    },
  );

  it("leaves Kroki diagrams as code and sends nothing unless asked", async () => {
    const sent: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      sent.push(url);
      return new Response('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"></svg>');
    });
    try {
      const { diagrams: _, ...rest } = offline;
      const fences = ["plantuml", "graphviz", "dot", "d2", "dbml", "goat", "svgbob"]
        .map((lang) => `\`\`\`${lang}\nunasked ${lang}\n\`\`\``)
        .join("\n\n");
      const off = await createHtmlRenderer(html(rest))(fences);
      expect(off).not.toContain('class="cdg"');
      expect(off.match(/<pre/g)).toHaveLength(7);
      expect(sent).toEqual([]);

      const authored = '::diagram{svg="<svg onload=alert(1)></svg>"}\n::';
      expect((await parseMarkdown(authored, html(rest))).meta.issues).toEqual([
        "`::diagram` 1 sets `svg`, which only comark-diagrams writes, so it's ignored. Draw the diagram from a fence, such as ```d2.",
      ]);

      const d2 = (source: string) => `\`\`\`d2\n${source}\n\`\`\``;
      expect(await renderHtml(d2("asked"), { diagrams: true })).toContain('class="cdg"');
      await renderHtml(d2("own server"), { diagrams: { server: "http://kroki.test/" } });
      await renderHtml(d2("not drawn"), { diagrams: { server: "http://kroki.test", draw: false } });
      expect(sent).toEqual(["https://kroki.io/d2/svg", "http://kroki.test/d2/svg"]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("includes files only when asked", async () => {
    const read = (path: string) => (path === "note.md" ? "Pasted." : undefined);
    const markdown = ':include{src="note.md"}';
    const off = await renderHtml(markdown);
    expect(off).not.toContain("Pasted.");
    const on = await renderHtml(markdown, { include: { read } });
    expect(on).toContain("Pasted.");
  });

  it("adds the side outline only when asked", async () => {
    const markdown = "## Install\n\n## Usage";
    expect(await renderHtml(markdown)).not.toContain("cto-rail");
    for (const preset of [html, vue, react]) {
      const { plugins } = preset({ ...offline, outline: { rail: true } });
      const { nodes } = await parseMarkdown(markdown, { plugins });
      expect(nodes.some((node) => Array.isArray(node) && node[0] === "toc-rail")).toBe(true);
    }
  });

  it("reads a table's file only when given a reader", async () => {
    const read = (path: string) => (path === "birds.csv" ? "Bird,Seen\nHeron,2" : undefined);
    const markdown = '::table{src="birds.csv"}\n::';
    const off = await renderHtml(markdown);
    expect(off).not.toContain("Heron");
    const on = await renderHtml(markdown, { table: { read } });
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
      // The same wrapper and bar as the HTML renderer; Pele zooms the diagram itself in the browser.
      expect(out, name).toMatch(
        /<div class="cmm" data-comark-frame(="")? data-source="flowchart LR\n {2}Draft --&gt; Review\n?">/,
      );
      expect(out, name).toContain('<div class="cmm-bar"><button type="button" class="cmm-image"');
      // In the server's HTML, unescaped, so the page arrives styled.
      expect(out, name).toContain("<style data-comark-typeset");
      expect(out, name).toContain("@scope{:where(:scope){");
      expect(out, name).toContain(":scope>:where(:nth-child(1 of :not(style,script)))");
    }
  });

  it("marks every block that draws its own frame, in every renderer", async () => {
    const framed = [
      "```ts\nconst a = 1\n```",
      "::code-group\n```sh [pnpm]\npnpm add x\n```\n```sh [npm]\nnpm i x\n```\n::",
      "> [!TIP]\n> Read this.",
    ];
    const plain = "Just a paragraph.";
    const roots = /<(\w+) class="(ck|ct|cgc|cd)"[^>]*>/g;
    const marked = (out: string) =>
      [...out.matchAll(roots)].map(([tag, , name]) => [name, tag.includes(" data-comark-frame")]);
    const vueRender = async (markdown: string) => {
      const preset = vue(offline);
      const value = await parseMarkdown(markdown, { plugins: preset.plugins });
      return renderVue(
        createSSRApp({ render: () => h(VueDocument, { value, components: preset.components }) }),
      );
    };
    for (const render of [renderHtml, vueRender]) {
      const out = await render([...framed, plain].join("\n\n"));
      expect(marked(out)).toEqual([
        ["ck", true],
        ["ct", true],
        ["ck", true],
        ["ck", true],
        ["cgc", true],
      ]);
      expect(out).toMatch(/<p>Just a paragraph.<\/p>/);
    }
    // diff renders only to HTML.
    const diff = await renderHtml("::diff\n```ts\na\n```\n```ts\nb\n```\n::");
    expect(marked(diff)).toEqual([["cd", true]]);
  });

  it("renders separately parsed documents without bundling chart parsers", async () => {
    const preset = vue(offline);
    expect(Object.keys(vueComponents).sort()).toEqual(Object.keys(preset.components).sort());
    const parsed = await parseMarkdown(document, { plugins: preset.plugins });
    const render = (components: Record<string, Component>) =>
      renderVue(createSSRApp({ render: () => h(VueDocument, { value: parsed, components }) }));
    expect(await render(vueComponents)).toBe(await render(preset.components));

    const entry = fileURLToPath(new URL("./fixtures/components.ts", import.meta.url));
    const result = await build({
      configFile: false,
      logLevel: "error",
      build: {
        write: false,
        minify: false,
        lib: {
          entry,
          formats: ["es"],
        },
        rollupOptions: { external: ["vue"] },
      },
    });
    const [{ output }] = result as Rolldown.RolldownOutput[];
    const modules = output.flatMap((file) => (file.type === "chunk" ? file.moduleIds : []));
    expect(modules.some((id) => /\/(?:comark-charts|charts)\/(?:dist|src)\/vue/.test(id))).toBe(
      true,
    );
    expect(modules.filter((id) => /\/(?:vega(?:-lite)?|flint-chart)\//.test(id))).toEqual([]);
  });

  it("loads each block's package in comark-ui/vue/lazy only when a document renders it", async () => {
    expect(Object.keys(lazyComponents).sort()).toEqual(Object.keys(vueComponents).sort());
    const parsed = await parseMarkdown(document, { plugins: vue(offline).plugins });
    const render = (components: Record<string, Component>) =>
      renderVue(createSSRApp({ render: () => h(VueDocument, { value: parsed, components }) }));
    // Vue's useId adds a segment for each async component above the caller, the same on the server and the client.
    const ids = (html: string) => html.replaceAll(/\bv-[\d-]+-(?=tab|panel)/g, "v-");
    expect(ids(await render(lazyComponents))).toBe(ids(await render(vueComponents)));

    const result = await build({
      configFile: false,
      logLevel: "error",
      build: {
        write: false,
        minify: false,
        lib: {
          entry: fileURLToPath(new URL("../src/vue-lazy.ts", import.meta.url)),
          formats: ["es"],
        },
        rollupOptions: { external: ["vue"] },
      },
    });
    // SAFETY: `write: false` gives the output, in an array of one for the one format.
    const [{ output }] = result as Rolldown.RolldownOutput[];
    const chunks = output.filter((file) => file.type === "chunk");
    const loaded = new Set<string>();
    const load = (name: string) => {
      if (loaded.has(name)) return;
      loaded.add(name);
      chunks.find((chunk) => chunk.fileName === name)?.imports.forEach(load);
    };
    for (const chunk of chunks) if (chunk.isEntry) load(chunk.fileName);
    const blockPackage = /\/packages\/(?!ui\/)[\w-]+\/(?:dist|src)\/vue\./;
    // The Mermaid wrapper's bar and styles and the typeset styles are about 19 kB a page renders without them.
    const ownBlock = /\/packages\/ui\/src\/(?:client|typeset-css|vue-mermaid|vue-typeset)\.ts$/;
    const eager = chunks
      .filter((chunk) => loaded.has(chunk.fileName))
      .flatMap((chunk) =>
        chunk.moduleIds.filter((id) => blockPackage.test(id) || ownBlock.test(id)),
      );
    expect(eager).toEqual([]);
    expect(chunks.some((chunk) => chunk.moduleIds.some((id) => blockPackage.test(id)))).toBe(true);
  });

  it("loads Pele in Vue only when a document has a diagram", async () => {
    const result = await build({
      configFile: false,
      logLevel: "error",
      build: {
        write: false,
        minify: false,
        lib: { entry: fileURLToPath(new URL("../src/vue.ts", import.meta.url)), formats: ["es"] },
        rollupOptions: { external: ["vue"] },
      },
    });
    // SAFETY: `write: false` gives the output, in an array of one for the one format.
    const [{ output }] = result as Rolldown.RolldownOutput[];
    const chunks = output.filter((file) => file.type === "chunk");
    const loaded = new Set<string>();
    const load = (name: string) => {
      if (loaded.has(name)) return;
      loaded.add(name);
      // `vue` is external, so it has no chunk.
      chunks.find((chunk) => chunk.fileName === name)?.imports.forEach(load);
    };
    for (const chunk of chunks) if (chunk.isEntry) load(chunk.fileName);
    const pele = chunks.filter((chunk) => chunk.moduleIds.some((id) => id.includes("/pele/dist/")));
    expect(pele.length).toBeGreaterThan(0);
    for (const chunk of pele) expect(loaded).not.toContain(chunk.fileName);
  });
});
