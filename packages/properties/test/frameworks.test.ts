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
import properties from "../src/index.ts";
import { components as htmlComponents } from "../src/html.ts";
import { components as reactComponents } from "../src/react.ts";
import { components as vueComponents } from "../src/vue.ts";

const markdown = [
  "---",
  "status: Ready",
  "pr: https://github.com/onmax/comark-ui/pull/111",
  "tags: [colors, docs]",
  "---",
  "",
  "# Palette",
  "",
  "::properties",
  "::",
  "",
  "After",
].join("\n");
// Drops what differs only in serialization: comments, whitespace between tags, and the HTML renderer's inline styles.
const normalize = (html: string) =>
  html
    .replace(/<!--.*?-->/g, "")
    .replace(/<style[^>]*>.*?<\/style>/g, "")
    .replace(/>\s+/g, ">")
    .replace(/\s+</g, "<")
    .replace(/\s+/g, " ")
    .trim();
const renderers = {
  vue: (value: MarkdownDocument) =>
    renderVue(createSSRApp({ render: () => h(VueDocument, { value, components: vueComponents }) })),
  react: (value: MarkdownDocument) =>
    renderReact(createElement(ReactDocument, { value, components: reactComponents })),
};

describe("comark-properties renderers", async () => {
  const value = await parseMarkdown(markdown, { plugins: [properties()] });
  const expected = normalize(await renderHtmlFromDocument(value, { components: htmlComponents }));

  it("renders the box under the title in HTML", () => {
    expect(expected).toContain(
      '<h1 id="palette">Palette</h1><dl class="cfm"><div data-key="status">',
    );
    expect(expected).toContain('<span class="cfm-tag">colors</span>');
  });

  for (const [name, render] of Object.entries(renderers))
    it(`renders the same markup in ${name}`, async () => {
      expect(normalize(await render(value))).toContain(expected);
    });

  it("ships a Svelte component that compiles", async () => {
    const source = await readFile(
      new URL("../src/svelte/Properties.svelte", import.meta.url),
      "utf8",
    );
    expect(() =>
      compile(source, { filename: "Properties.svelte", generate: "server" }),
    ).not.toThrow();
  });
});
