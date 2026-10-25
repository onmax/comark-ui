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
import mark from "../src/index.ts";
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
// Drops what differs only in serialization: comments, whitespace, and the HTML renderer's inline styles.
const normalize = (html: string) =>
  html
    .replace(/<style[^>]*>.*?<\/style>/gs, "")
    .replace(/<!--.*?-->/g, "")
    .replace(/>\s+</g, "><")
    .replace(/\s+/g, " ")
    .trim();

describe("comark-mark renderers", () => {
  it("renders the same classed highlights and superscripts in every renderer", async () => {
    const value = await parseMarkdown(
      "==Do **not** deploy=={.warning} before the 1^st^ pigeon ==count==.",
      {
        plugins: [mark()],
      },
    );
    const expected =
      '<p><mark class="cmk-mark warning">Do <strong>not</strong> deploy</mark> before the 1<sup class="cmk-sup">st</sup> pigeon <mark class="cmk-mark">count</mark>.';
    expect(normalize(await renderers.html(value))).toContain(expected);
    expect(normalize(await renderers.vue(value))).toContain(expected);
    expect(normalize(renderers.react(value))).toContain(expected);
  });

  it("puts the HTML renderer's styles in the document once", async () => {
    const value = await parseMarkdown("==a== ==b== x^2^", { plugins: [mark()] });
    const html = await renderers.html(value);
    expect(html.match(/<style data-comark-mark>/g)).toHaveLength(1);
    expect(html).toContain("@layer comark{");
  });

  it("ships Svelte components that compile", async () => {
    const folder = new URL("../src/svelte/", import.meta.url);
    const files = (await readdir(folder)).filter((file) => file.endsWith(".svelte"));
    expect(files).toHaveLength(3);
    for (const file of files) {
      const source = await readFile(new URL(file, folder), "utf8");
      expect(() => compile(source, { filename: file, generate: "server" })).not.toThrow();
    }
  });
});
