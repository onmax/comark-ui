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
import badge from "../src/index.ts";
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
// Drops what differs only in serialization: comments, whitespace, including the HTML renderer's indents around inline
// content, and its inline styles.
const normalize = (html: string) =>
  html
    .replace(/<style[^>]*>.*?<\/style>/gs, "")
    .replace(/<!--.*?-->/g, "")
    .replace(/>\s+/g, ">")
    .replace(/\s+</g, "<")
    .replace(/\s+/g, " ")
    .trim();

describe("comark-badge renderers", () => {
  it("renders the same badges in every renderer", async () => {
    const value = await parseMarkdown(
      '## API :badge[New]{color="success" #new .x}\n\n::badge\n**v4.0.0**\n::',
      { plugins: [badge()] },
    );
    const expected = normalize(await renderers.html(value));
    expect(expected).toContain('<span class="cb" data-color="success">New</span>');
    for (const name of ["vue", "react"] as const) {
      const html = normalize(await renderers[name](value));
      expect(html, name).toContain(expected);
      expect(html, name).not.toMatch(/id="new"|class="x"|undefined/);
    }
  });

  it("renders static and hosted image badges in each framework", async () => {
    const value = await parseMarkdown(
      ':badge[ready]{label="build" icon="check"} :badge{source="npm-version" package="comark-ui"}',
      { plugins: [badge()] },
    );
    for (const renderer of Object.values(renderers)) {
      const html = await renderer(value);
      expect(html).toContain('class="cb-image"');
      expect(html).toContain('alt="build: ready"');
      expect(html).toContain("data:image/svg+xml,");
      expect(html).toContain("https://comark-ui.onmax.me/badge.svg?");
    }
  });

  it("ships Svelte components that compile", async () => {
    const source = await readFile(new URL("../src/svelte/Badge.svelte", import.meta.url), "utf8");
    expect(() => compile(source, { filename: "Badge.svelte", generate: "server" })).not.toThrow();
  });
});
