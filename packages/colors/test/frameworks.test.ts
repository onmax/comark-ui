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
import colors from "../src/index.ts";
import { components as htmlComponents } from "../src/html.ts";
import { components as reactComponents } from "../src/react.ts";
import { components as vueComponents } from "../src/vue.ts";

const markdown = [
  "Links use `#3b82f6` and `rgb(239 68 68 / 50%)`.",
  "::palette\n- Primary & accent: `#3b82f6`\n- Danger: oklch(0.64 0.21 25)\n::",
  "After",
].join("\n\n");
// Drops what differs only in serialization: comments, whitespace between tags, and the HTML renderer's inline styles.
const normalize = (html: string) =>
  html
    .replace(/<!--.*?-->/g, "")
    .replace(/<style[^>]*>.*?<\/style>/g, "")
    .replace(/\s*(<[^>]+>)\s*/g, "$1")
    .replace(/style="--cco: ?([^";]*);?"/g, 'style="--cco:$1"')
    .replace(/\s+/g, " ")
    .trim();
const renderers = {
  vue: (value: MarkdownDocument) =>
    renderVue(createSSRApp({ render: () => h(VueDocument, { value, components: vueComponents }) })),
  react: (value: MarkdownDocument) =>
    renderReact(createElement(ReactDocument, { value, components: reactComponents })),
};

describe("comark-colors renderers", async () => {
  const value = await parseMarkdown(markdown, { plugins: [colors()] });
  const expected = normalize(await renderHtmlFromDocument(value, { components: htmlComponents }));

  it("renders swatches and a palette in HTML", () => {
    expect(expected.match(/class="cco-swatch"/g)).toHaveLength(2);
    expect(expected).toContain('<ul class="cco-palette"><li>');
    expect(expected).toContain('<span class="cco-name">Primary &amp; accent</span>');
  });

  for (const [name, render] of Object.entries(renderers))
    it(`renders the same markup in ${name}`, async () => {
      expect(normalize(await render(value))).toContain(expected);
    });

  for (const file of ["Color", "Palette"])
    it(`ships a Svelte ${file} component that compiles`, async () => {
      const source = await readFile(
        new URL(`../src/svelte/${file}.svelte`, import.meta.url),
        "utf8",
      );
      expect(() =>
        compile(source, { filename: `${file}.svelte`, generate: "server" }),
      ).not.toThrow();
    });
});
