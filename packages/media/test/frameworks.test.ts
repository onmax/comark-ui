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
import media from "../src/index.ts";
import { components as htmlComponents } from "../src/html.ts";
import { components as reactComponents } from "../src/react.ts";
import { components as vueComponents } from "../src/vue.ts";

const markdown = [
  '![Login & logout](./login.mp4){autoplay loop muted poster="login.png" width=1280 height=720}',
  "![Standup](standup.m4a)",
  "https://github.com/user-attachments/assets/2f3c0e3e-1c4b-4c3a-9a6b-0b1e2f3a4b5c",
].join("\n\n");
// Drops what differs only in serialization: comments, whitespace between tags, the HTML renderer's inline styles and
// script, and
// how React writes boolean attributes and names, which HTML reads without case.
const normalize = (html: string) =>
  html
    .replace(/<!--.*?-->/g, "")
    .replace(/<(style|script)[^>]*>.*?<\/\1>/gs, "")
    .replace(
      / (controls|playsinline|autoplay|loop|muted)(?:="")?/gi,
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

describe("comark-media renderers", async () => {
  const value = await parseMarkdown(markdown, { plugins: [media({ size: false })] });
  const expected = normalize(await renderHtmlFromDocument(value, { components: htmlComponents }));

  it("renders a video, audio, and an attachment in HTML", () => {
    expect(expected.match(/<span class="cm cm-video"/g)).toHaveLength(2);
    expect(expected.match(/<span class="cm cm-audio"/g)).toHaveLength(1);
    expect(expected).toContain("Login &amp; logout");
    expect(expected).toContain('width="1280" height="720"');
  });

  for (const [name, render] of Object.entries(renderers))
    it(`renders the same markup in ${name}`, async () => {
      expect(normalize(await render(value))).toContain(
        expected.replace(/^<div[^>]*>|<\/div>$/g, ""),
      );
    });

  it("ships a Svelte component that compiles", async () => {
    const source = await readFile(new URL("../src/svelte/Media.svelte", import.meta.url), "utf8");
    expect(() => compile(source, { filename: "Media.svelte", generate: "server" })).not.toThrow();
  });
});
