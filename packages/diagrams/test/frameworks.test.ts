import { readFile } from "node:fs/promises";
import { renderHtmlFromDocument } from "@comark/html";
import { MarkdownDocument as ReactDocument } from "@comark/react";
import { MarkdownDocument as VueDocument } from "@comark/vue";
import { type MarkdownDocument, parseMarkdown } from "comark";
import { createElement } from "react";
import { renderToString as renderReact } from "react-dom/server";
import { compile } from "svelte/compiler";
import { describe, expect, it, vi } from "vite-plus/test";
import { createSSRApp, h } from "vue";
import { renderToString as renderVue } from "vue/server-renderer";
import diagrams from "../src/index.ts";
import { components as htmlComponents } from "../src/html.ts";
import { components as reactComponents } from "../src/react.ts";
import { components as vueComponents } from "../src/vue.ts";

// Drops what differs only in serialization: comments, whitespace between tags, and the HTML renderer's inline styles.
const normalize = (html: string) =>
  html
    .replace(/<!--.*?-->/g, "")
    .replace(/<style[^>]*>.*?<\/style>/g, "")
    .replace(/\s*\n\s*/g, "")
    .trim();
const renderers = {
  vue: (value: MarkdownDocument) =>
    renderVue(createSSRApp({ render: () => h(VueDocument, { value, components: vueComponents }) })),
  react: (value: MarkdownDocument) =>
    renderReact(createElement(ReactDocument, { value, components: reactComponents })),
};

describe("comark-diagrams renderers", async () => {
  vi.stubGlobal("fetch", async () => new Response('<svg viewBox="0 0 4 4"><circle r="2"/></svg>'));
  const value = await parseMarkdown("```d2 [Ducks & geese]\nduck -> pond\n```", {
    plugins: [diagrams()],
  });
  vi.unstubAllGlobals();
  const expected = normalize(await renderHtmlFromDocument(value, { components: htmlComponents }));

  it("renders the figure in HTML", () => {
    expect(expected).toContain('<figure class="cdg" data-type="d2">');
    expect(expected).toContain("Ducks &amp; geese");
  });

  for (const [name, render] of Object.entries(renderers))
    it(`renders the same markup in ${name}`, async () => {
      expect(normalize(await render(value))).toContain(expected);
    });

  it("ships a Svelte component that compiles", async () => {
    const source = await readFile(new URL("../src/svelte/Diagram.svelte", import.meta.url), "utf8");
    expect(() => compile(source, { filename: "Diagram.svelte", generate: "server" })).not.toThrow();
  });
});
