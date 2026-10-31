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
import embed from "../src/index.ts";
import { components as htmlComponents } from "../src/html.ts";
import { components as reactComponents } from "../src/react.ts";
import { components as vueComponents } from "../src/vue.ts";

const markdown = [
  '::embed{url="https://youtu.be/dQw4w9WgXcQ?t=90" title="Launch & demo" #id .class}\n::',
  '::embed{url="https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC"}\n::',
  '::embed{url="https://x.com/_onmax/status/2116191062418997278"}\n::',
  '::embed{url="https://example.com/docs" title="Setup guide"}\n::',
  '::embed{url="javascript:alert(1)"}\n::',
  "After",
].join("\n\n");
// Drops what differs only in serialization: comments, whitespace between tags, the HTML renderer's inline styles and
// script, and
// how React writes attribute names, which HTML reads without case.
const normalize = (html: string) =>
  html
    .replace(/<!--.*?-->/g, "")
    .replace(/<style[^>]*>.*?<\/style>|<script>[\s\S]*?<\/script>/g, "")
    .replace(
      / (allowfullscreen|referrerpolicy)(?:="")?/gi,
      (_, name: string) => ` ${name.toLowerCase()}`,
    )
    .replace(/>\s+</g, "><")
    .replace(/\s+/g, " ")
    .trim();
const renderers = {
  vue: (value: MarkdownDocument) =>
    renderVue(createSSRApp({ render: () => h(VueDocument, { value, components: vueComponents }) })),
  react: (value: MarkdownDocument) =>
    renderReact(createElement(ReactDocument, { value, components: reactComponents })),
};

describe("comark-embed renderers", async () => {
  const value = await parseMarkdown(markdown, { plugins: [embed()] });
  const expected = normalize(await renderHtmlFromDocument(value, { components: htmlComponents }));

  it("renders a player, a card, and nothing for an unsafe link in HTML", () => {
    expect(expected.match(/<figure class="ce"/g)).toHaveLength(3);
    expect(expected).toContain('<a class="ce-card" href="https://example.com/docs">');
    expect(expected).toContain("Launch &amp; demo");
    expect(expected).not.toMatch(/alert|"id"|"class"/);
  });

  for (const [name, render] of Object.entries(renderers))
    it(`renders the same markup in ${name}`, async () => {
      expect(normalize(await render(value))).toContain(expected);
    });

  it("ships a Svelte component that compiles", async () => {
    const source = await readFile(new URL("../src/svelte/Embed.svelte", import.meta.url), "utf8");
    expect(() => compile(source, { filename: "Embed.svelte", generate: "server" })).not.toThrow();
  });
});
