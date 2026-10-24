import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
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
import cast from "../src/index.ts";
import { components as htmlComponents } from "../src/html.ts";
import { components as reactComponents } from "../src/react.ts";
import { components as vueComponents } from "../src/vue.ts";

const root = fileURLToPath(new URL("fixtures/", import.meta.url));
const markdown = [
  '::cast{src="test.cast" title="Tests & checks"}\n::',
  '::cast{src="v3.cast" mode="log"}\n::',
  '::cast{src="missing.cast"}\n::',
  "After",
].join("\n\n");
// Drops what differs only in serialization: comments, the HTML renderer's inline styles, and how React writes a style.
const normalize = (html: string) =>
  html
    .replace(/<!--.*?-->/g, "")
    .replace(/<style[^>]*>.*?<\/style>/gs, "")
    .replace(/style="([^"]*?);?"/g, (_, style: string) => `style="${style.replace(/: /g, ":")}"`)
    .replace(/>\s+<(?!span)/g, "><")
    .trim();
const renderers = {
  vue: (value: MarkdownDocument) =>
    renderVue(createSSRApp({ render: () => h(VueDocument, { value, components: vueComponents }) })),
  react: (value: MarkdownDocument) =>
    renderReact(createElement(ReactDocument, { value, components: reactComponents })),
};

describe("comark-cast renderers", async () => {
  const value = await parseMarkdown(markdown, { plugins: [cast({ root })] });
  const expected = normalize(await renderHtmlFromDocument(value, { components: htmlComponents }));

  it("renders two terminals and nothing for a missing cast in HTML", () => {
    expect(expected.match(/<figure class="cca"/g)).toHaveLength(2);
    expect(expected).toContain("<figcaption>Tests &amp; checks</figcaption>");
    expect(expected).toContain('<pre class="cca-term">one\ntwo\nthree\nfour</pre>');
  });

  for (const [name, render] of Object.entries(renderers))
    it(`renders the same markup in ${name}`, async () => {
      expect(normalize(await render(value))).toContain(expected);
    });

  it("ships a Svelte component that compiles", async () => {
    const source = await readFile(new URL("../src/svelte/Cast.svelte", import.meta.url), "utf8");
    expect(() => compile(source, { filename: "Cast.svelte", generate: "server" })).not.toThrow();
  });
});
