import { readFile } from "node:fs/promises";
import { renderHtmlFromDocument } from "@comark/html";
import { MarkdownDocument as ReactDocument } from "@comark/react";
import { MarkdownDocument as VueDocument } from "@comark/vue";
import { parseMarkdown } from "comark";
import { createElement } from "react";
import { renderToString as renderReact } from "react-dom/server";
import { compile } from "svelte/compiler";
import { describe, expect, it } from "vite-plus/test";
import { createSSRApp, h } from "vue";
import { renderToString as renderVue } from "vue/server-renderer";
import charts from "../src/index.ts";
import { components as htmlComponents } from "../src/html.ts";
import { components as reactComponents } from "../src/react.ts";
import { components as vueComponents } from "../src/vue.ts";

// Drops what differs only in serialization: comments, whitespace between tags, the HTML renderer's inline styles,
// and how each framework closes an empty element.
const normalize = (html: string) =>
  html
    .replace(/<!--.*?-->/g, "")
    .replace(/<style[^>]*>.*?<\/style>/gs, "")
    .replace(/\s*\/>/g, ">")
    .replace(/>\s+</g, "><")
    .trim();

const markdown = `::chart{title="Bundle size"}
| package | size (kB) |
| --- | --: |
| annotate | 41.2 |
| zoom | 18.1 |
::`;

describe("comark-charts renderers", () => {
  it("draws the same chart in every renderer, with Vega left on the server", async () => {
    const value = await parseMarkdown(markdown, { plugins: [charts()] });
    const html = normalize(await renderHtmlFromDocument(value, { components: htmlComponents }));
    expect(html).toContain(
      '<figure class="cch" data-type="bar"><figcaption>Bundle size</figcaption><div class="cch-plot"><svg role="img" aria-label="Bundle size"',
    );
    const vue = normalize(
      await renderVue(
        createSSRApp({ render: () => h(VueDocument, { value, components: vueComponents }) }),
      ),
    );
    const react = normalize(
      renderReact(createElement(ReactDocument, { value, components: reactComponents })),
    );
    for (const output of [vue, react]) {
      const svg = /<svg[^]*<\/svg>/.exec(output)?.[0];
      expect(svg).toBe(/<svg[^]*<\/svg>/.exec(html)?.[0]);
      expect(output).toContain(
        '<figure class="cch" data-type="bar"><figcaption>Bundle size</figcaption>',
      );
      expect(output).toContain('<details class="cch-data"><summary>Data</summary>');
      expect(output).toContain("<td>annotate</td>");
    }
  });

  it("checks without drawing when told not to draw", async () => {
    const value = await parseMarkdown(markdown, { plugins: [charts({ draw: false })] });
    expect(value.meta.issues).toEqual([]);
    expect(
      normalize(await renderHtmlFromDocument(value, { components: htmlComponents })),
    ).not.toContain("<svg");
  });

  it("ships a Svelte component that compiles", async () => {
    const source = await readFile(new URL("../src/svelte/Chart.svelte", import.meta.url), "utf8");
    expect(() => compile(source, { filename: "Chart.svelte", generate: "server" })).not.toThrow();
  });
});
