import { readdir, readFile } from "node:fs/promises";
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
import { anchors, external } from "../src/index.ts";
import { components as htmlComponents } from "../src/html.ts";
import { components as reactComponents } from "../src/react.ts";
import { components as vueComponents } from "../src/vue.ts";

const renderers = {
  html: (value: MarkdownDocument) => renderHtmlFromDocument(value, { components: htmlComponents }),
  vue: (value: MarkdownDocument) =>
    renderVue(createSSRApp({ render: () => h(VueDocument, { value, components: vueComponents }) })),
  react: (value: MarkdownDocument) =>
    renderReact(createElement(ReactDocument, { value, components: reactComponents })),
};
// Drops what differs only in serialization: comments, whitespace, escaped quotes in text, and the HTML renderer's
// inline styles.
const normalize = (html: string) =>
  html
    .replace(/<style[^>]*>.*?<\/style>/gs, "")
    .replace(/<!--.*?-->/g, "")
    .replace(/&quot;/g, '"')
    .replace(/>\s+</g, "><")
    .replace(/\s+/g, " ")
    .trim();

describe("comark-links renderers", () => {
  it("renders the same headings and links in every renderer", async () => {
    const value = await parseMarkdown(
      "# Title\n\n## Setup **now**\n\nRead [the guide](https://example.com) or [home](/).",
      { plugins: [external({ target: "_blank" }), anchors()] },
    );
    const expected = normalize(await renderers.html(value));
    expect(expected).toContain(
      '<div class="cl-heading"><h2 id="setup-now">Setup <strong>now</strong></h2><a class="cl-anchor" href="#setup-now"><span aria-hidden="true">#</span><span class="cl-sr">Section titled "Setup now"</span></a></div>',
    );
    expect(expected).toContain(
      '<a href="https://example.com" target="_blank" rel="noopener">the guide<span class="cl-icon" aria-hidden="true">↗</span><span class="cl-sr">(opens in a new tab)</span></a>',
    );
    expect(normalize(await renderers.vue(value))).toContain(expected);
    expect(normalize(renderers.react(value))).toContain(expected);
  });

  it("ships Svelte components that compile", async () => {
    const folder = new URL("../src/svelte/", import.meta.url);
    const files = (await readdir(folder)).filter((file) => file.endsWith(".svelte"));
    expect(files).toHaveLength(8);
    for (const file of files) {
      const source = await readFile(new URL(file, folder), "utf8");
      expect(() => compile(source, { filename: file, generate: "server" })).not.toThrow();
    }
  });
});
