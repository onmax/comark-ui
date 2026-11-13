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
import bundle from "../src/index.ts";
import { components as htmlComponents } from "../src/html.ts";
import { components as reactComponents } from "../src/react.ts";
import { components as vueComponents } from "../src/vue.ts";

const root = new URL("fixtures/", import.meta.url).pathname;
const markdown =
  '::bundle{before="vite/main/assets" after="vite/pr/assets" title="Ducks & geese"}\n::';
// Drops what differs only in serialization: comments, line breaks between tags, empty attributes, entities, and the
// HTML renderer's inline styles.
const normalize = (html: string) =>
  html
    .replace(/ (data-[a-z-]+)=""/g, " $1")
    .replace(/<!--.*?-->/g, "")
    .replace(/<style[^>]*>.*?<\/style>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;|&#x27;/g, "'")
    .replace(/&gt;/g, ">")
    .replace(/\s*\n\s*/g, "")
    .trim();
const renderers = {
  vue: (value: MarkdownDocument) =>
    renderVue(createSSRApp({ render: () => h(VueDocument, { value, components: vueComponents }) })),
  react: (value: MarkdownDocument) =>
    renderReact(createElement(ReactDocument, { value, components: reactComponents })),
};

describe("comark-bundle renderers", async () => {
  const value = await parseMarkdown(markdown, { plugins: [bundle({ root })] });
  const expected = normalize(await renderHtmlFromDocument(value, { components: htmlComponents }));

  it("renders the frame, the bars, and the disclosure in HTML", () => {
    expect(expected).toContain(
      '<figure class="cbr" data-comark-frame data-not-typeset aria-label="Ducks & geese"><div class="cbr-head">',
    );
    expect(expected).toContain('<details class="cbr-more"><summary>');
  });

  for (const [name, render] of Object.entries(renderers))
    it(`renders the same markup in ${name}`, async () => {
      expect(normalize(await render(value))).toContain(expected);
    });

  it("ships Bundle.svelte, which compiles", async () => {
    const source = await readFile(new URL("../src/svelte/Bundle.svelte", import.meta.url), "utf8");
    expect(() => compile(source, { filename: "Bundle.svelte", generate: "server" })).not.toThrow();
  });
});
