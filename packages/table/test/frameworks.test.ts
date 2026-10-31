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
import table from "../src/index.ts";
import { components as htmlComponents } from "../src/html.ts";
import { components as reactComponents } from "../src/react.ts";
import { components as vueComponents } from "../src/vue.ts";

const markdown =
  '::table{sort}\n```csv\nName,Size\n"zoom & tabs",3\nchips,[9]{tone="error"}\n```\n::';
// Drops what differs only in serialization: comments, whitespace between tags, the HTML renderer's inline script and
// styles, and how React writes a style.
const normalize = (html: string) =>
  html
    .replace(/<!--.*?-->/g, "")
    .replace(/<(style|script)[^>]*>.*?<\/\1>/gs, "")
    .replace(/style="text-align:\s*right;?"/g, 'style="text-align:right"')
    .replace(/&amp;/g, "&")
    .replace(/>\s+</g, "><")
    .replace(/>\s+|\s+</g, (space) => space.trim())
    .replace(/\s+/g, " ")
    .trim();
const renderers = {
  vue: (value: MarkdownDocument) =>
    renderVue(createSSRApp({ render: () => h(VueDocument, { value, components: vueComponents }) })),
  react: (value: MarkdownDocument) =>
    renderReact(createElement(ReactDocument, { value, components: reactComponents })),
};

describe("comark-table renderers", async () => {
  const value = await parseMarkdown(markdown, { plugins: [table()] });
  const expected = normalize(await renderHtmlFromDocument(value, { components: htmlComponents }));

  it("renders the bar, the sort buttons, and the cells in HTML", () => {
    expect(expected).toContain('<div class="ctb"><div class="ctb-bar">');
    expect(expected).toContain('<button type="button" class="ctb-sort">Name</button>');
    expect(expected).toContain("zoom & tabs");
    expect(expected).toContain('#ee3533))) 20%,transparent)">9</td>');
  });

  for (const [name, render] of Object.entries(renderers))
    it(`renders the same markup in ${name}`, async () => {
      expect(normalize(await render(value))).toContain(expected);
    });

  it("ships a Svelte component that compiles", async () => {
    const source = await readFile(
      new URL("../src/svelte/DataTable.svelte", import.meta.url),
      "utf8",
    );
    expect(() =>
      compile(source, { filename: "DataTable.svelte", generate: "server" }),
    ).not.toThrow();
  });
});
