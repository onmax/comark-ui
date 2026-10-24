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
import qr from "../src/index.ts";
import { components as htmlComponents } from "../src/html.ts";
import { components as reactComponents } from "../src/react.ts";
import { components as vueComponents } from "../src/vue.ts";

const markdown =
  'Scan :qr{value="https://comark-ui.onmax.me/?a=1&b=2"} on a phone.\n\n:qr\n\nAfter';
// Drops what differs only in serialization: comments, whitespace between tags, the HTML renderer's inline styles, and
// whether a bare `&` is escaped.
const normalize = (html: string) =>
  html
    .replace(/<!--.*?-->/g, "")
    .replace(/<style[^>]*>.*?<\/style>/g, "")
    .replace(/>\s+/g, ">")
    .replace(/\s+</g, "<")
    .replaceAll("&amp;", "&")
    .replace(/\s+/g, " ")
    .trim();
const renderers = {
  vue: (value: MarkdownDocument) =>
    renderVue(createSSRApp({ render: () => h(VueDocument, { value, components: vueComponents }) })),
  react: (value: MarkdownDocument) =>
    renderReact(createElement(ReactDocument, { value, components: reactComponents })),
};

describe("comark-qr renderers", async () => {
  const value = await parseMarkdown(markdown, { plugins: [qr()] });
  const expected = normalize(await renderHtmlFromDocument(value, { components: htmlComponents }));

  it("renders one code, and nothing for a broken one, in HTML", () => {
    expect(expected.match(/<span class="cqr"/g)).toHaveLength(1);
    expect(expected).toContain('aria-label="QR code: https://comark-ui.onmax.me/?a=1&b=2"');
  });

  for (const [name, render] of Object.entries(renderers))
    it(`renders the same markup in ${name}`, async () => {
      expect(normalize(await render(value))).toContain(expected);
    });

  it("ships a Svelte component that compiles", async () => {
    const source = await readFile(new URL("../src/svelte/Qr.svelte", import.meta.url), "utf8");
    expect(() => compile(source, { filename: "Qr.svelte", generate: "server" })).not.toThrow();
  });
});
