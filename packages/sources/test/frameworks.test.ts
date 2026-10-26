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
import sources from "../src/index.ts";
import { components as htmlComponents } from "../src/html.ts";
import { components as reactComponents } from "../src/react.ts";
import { components as vueComponents } from "../src/vue.ts";

const markdown = [
  "Pigeons home by the sun :cite[1] & smell :cite[1,2].",
  '::sources{title="References"}\n1. [Magnetoreception](https://en.wikipedia.org/wiki/Magnetoreception)\n2. [Homing](https://example.com/homing)\n::',
  "After",
].join("\n\n");
// Drops what differs only in serialization: comments, whitespace between tags, the HTML renderer's inline styles and
// script, which the components add when they mount, and whether a bare `&` is escaped.
const normalize = (html: string) =>
  html
    .replace(/<!--.*?-->/g, "")
    .replace(/<style[^>]*>.*?<\/style>/g, "")
    .replace(/<script>.*?<\/script>/gs, "")
    .replace(/\s*\n\s*/g, "")
    .replaceAll("&amp;", "&")
    .replace(/\s+/g, " ")
    .trim();
const renderers = {
  vue: (value: MarkdownDocument) =>
    renderVue(createSSRApp({ render: () => h(VueDocument, { value, components: vueComponents }) })),
  react: (value: MarkdownDocument) =>
    renderReact(createElement(ReactDocument, { value, components: reactComponents })),
};

describe("comark-sources renderers", async () => {
  const value = await parseMarkdown(markdown, { plugins: [sources()] });
  const expected = normalize(await renderHtmlFromDocument(value, { components: htmlComponents }));

  it("renders citations and the sources in HTML", () => {
    expect(expected).toContain(
      '<sup class="cso-cite">[<a href="#cso-1" id="cso-1-cite-1" title="Magnetoreception">1</a>]</sup>',
    );
    expect(expected).toContain(
      '<section class="cso" aria-label="References"><p class="cso-title">References</p><ol><li id="cso-1">',
    );
  });

  for (const [name, render] of Object.entries(renderers))
    it(`renders the same markup in ${name}`, async () => {
      expect(normalize(await render(value))).toContain(expected);
    });

  it("ships a Svelte component that compiles", async () => {
    const source = await readFile(new URL("../src/svelte/Sources.svelte", import.meta.url), "utf8");
    expect(() => compile(source, { filename: "Sources.svelte", generate: "server" })).not.toThrow();
  });
});
