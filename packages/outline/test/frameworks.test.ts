import { readFile } from "node:fs/promises";
import { renderHtmlFromDocument } from "@comark/html";
import { MarkdownDocument as ReactDocument } from "@comark/react";
import { MarkdownDocument as VueDocument } from "@comark/vue";
import { type MarkdownDocument, parseMarkdown } from "comark";
import { createElement } from "react";
import { renderToString as renderReact } from "react-dom/server";
import { compile } from "svelte/compiler";
import { describe, expect, it } from "vite-plus/test";
import { createSSRApp, h } from "vue";
import { renderToString as renderVue } from "vue/server-renderer";
import toc from "../src/index.ts";
import { components as htmlComponents } from "../src/html.ts";
import { components as reactComponents } from "../src/react.ts";
import { components as vueComponents } from "../src/vue.ts";

const markdown = [
  '::toc{title="On this page"}\n::',
  "## Install & run",
  "### Options",
  "## FAQ",
  "::toc{depth=9}\n::",
].join("\n\n");
const railed = "## Install & run\n\n### Options\n\n## FAQ";
// Drops what differs only in serialization: comments, whitespace between tags, the HTML renderer's inline styles, and
// whether a bare `&` is escaped.
const normalize = (html: string) =>
  html
    .replace(/<!--.*?-->/g, "")
    .replace(/<style[^>]*>.*?<\/style>/g, "")
    .replace(/>\s+</g, "><")
    .replaceAll("&amp;", "&")
    .replace(/\s+/g, " ")
    .trim();
const renderers = {
  vue: (value: MarkdownDocument) =>
    renderVue(createSSRApp({ render: () => h(VueDocument, { value, components: vueComponents }) })),
  react: (value: MarkdownDocument) =>
    renderReact(createElement(ReactDocument, { value, components: reactComponents })),
};

describe("comark-outline renderers", async () => {
  const value = await parseMarkdown(markdown, { plugins: [toc()] });
  const expected = normalize(await renderHtmlFromDocument(value, { components: htmlComponents }));

  it("renders one contents box, and nothing for a broken one, in HTML", () => {
    expect(expected.match(/<nav class="cto"/g)).toHaveLength(1);
    expect(expected).toContain('<p class="cto-title">On this page</p>');
    expect(expected).toContain('<a href="#install-run">Install & run</a>');
  });

  for (const [name, render] of Object.entries(renderers))
    it(`renders the same markup in ${name}`, async () => {
      expect(normalize(await render(value))).toContain(expected);
    });

  it("ships Svelte components that compile", async () => {
    for (const name of ["Toc.svelte", "TocRail.svelte"]) {
      const source = await readFile(new URL(`../src/svelte/${name}`, import.meta.url), "utf8");
      expect(() => compile(source, { filename: name, generate: "server" })).not.toThrow();
    }
  });
});

describe("comark-outline side outline renderers", async () => {
  const value = await parseMarkdown(railed, { plugins: [toc({ rail: true })] });
  const expected = normalize(await renderHtmlFromDocument(value, { components: htmlComponents }))
    .replace(/<script>.*?<\/script>/g, "")
    .replace(/^.*?(?=<nav)/, "");

  it("renders the outline as a nav in HTML", () => {
    expect(expected).toMatch(
      /^<nav class="cto cto-rail" aria-label="On this page"><p class="cto-title">On this page<\/p><ul><li><a href="#install-run">Install & run<\/a>/,
    );
  });

  for (const [name, render] of Object.entries(renderers))
    it(`renders the same outline in ${name}`, async () => {
      expect(normalize(await render(value))).toContain(expected);
    });
});
