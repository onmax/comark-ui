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
import notes from "../src/index.ts";
import { components as htmlComponents } from "../src/html.ts";
import { components as reactComponents } from "../src/react.ts";
import { components as vueComponents } from "../src/vue.ts";

const markdown = "```ts\nconst a = 1 // <1>\n```\n\n1. Why **a** & not b.";
// Drops what differs only in serialization: comments, whitespace between tags, and the HTML renderer's inline styles.
const normalize = (html: string) =>
  html
    .replace(/<!--.*?-->/g, "")
    .replace(/<style[^>]*>.*?<\/style>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/\s*\n\s*/g, "")
    .trim();
const renderers = {
  vue: (value: MarkdownDocument) =>
    renderVue(createSSRApp({ render: () => h(VueDocument, { value, components: vueComponents }) })),
  react: (value: MarkdownDocument) =>
    renderReact(createElement(ReactDocument, { value, components: reactComponents })),
};

describe("comark-code-notes renderers", async () => {
  const value = await parseMarkdown(markdown, { plugins: [notes()] });
  const html = normalize(await renderHtmlFromDocument(value, { components: htmlComponents }));
  const list = /<ol class="cn-notes">.*<\/ol>/.exec(html)?.[0] ?? "";
  const marker = /<a class="cn-marker"[^>]*><\/a>/.exec(html)?.[0] ?? "";

  it("renders a marker and its note in HTML", () => {
    expect(list).toContain("Why <strong>a</strong> & not b.");
    expect(marker).toContain('aria-label="Note 1"');
  });

  for (const [name, render] of Object.entries(renderers))
    it(`renders the same markup in ${name}`, async () => {
      const out = normalize(await render(value));
      expect(out).toContain(list);
      expect(out).toContain(marker);
    });

  it("ships a Svelte component that compiles", async () => {
    const source = await readFile(
      new URL("../src/svelte/CodeNotes.svelte", import.meta.url),
      "utf8",
    );
    expect(() =>
      compile(source, { filename: "CodeNotes.svelte", generate: "server" }),
    ).not.toThrow();
  });
});
