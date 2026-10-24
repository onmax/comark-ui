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
import metrics from "../src/index.ts";
import { components as htmlComponents } from "../src/html.ts";
import { components as reactComponents } from "../src/react.ts";
import { components as vueComponents } from "../src/vue.ts";

const markdown = [
  'The bundle went :delta{from=412 to=388 unit="kB" better="lower"} and :progress{value=0.85 label="Tests & docs"} migrated.',
  '::stats{better="lower"}\n| Metric | Before | After |\n| --- | --- | --- |\n| JS | 412 kB | 388 kB |\n::',
  '::stats{tiles better="lower"}\n| Metric | Before | After |\n| --- | --- | --- |\n| CSS | 40 kB | 44 kB |\n::',
].join("\n\n");
// Drops what differs only in serialization: comments, whitespace between tags, and the HTML renderer's inline styles.
const normalize = (html: string) =>
  html
    .replace(/<!--.*?-->/g, "")
    .replace(/<style[^>]*>.*?<\/style>/g, "")
    .replace(/>\s+</g, "><")
    .replace(/\s+/g, " ")
    .trim();
const tight = (html: string) => html.replace(/\s*(<[^>]+>)\s*/g, "$1");
const renderers = {
  vue: (value: MarkdownDocument) =>
    renderVue(createSSRApp({ render: () => h(VueDocument, { value, components: vueComponents }) })),
  react: (value: MarkdownDocument) =>
    renderReact(createElement(ReactDocument, { value, components: reactComponents })),
};

describe("comark-metrics renderers", async () => {
  const value = await parseMarkdown(markdown, { plugins: [metrics()] });
  const html = normalize(await renderHtmlFromDocument(value, { components: htmlComponents }));

  it("renders a delta, a progress bar, a stats table, and stat tiles in HTML", () => {
    expect(html.match(/<span class="cmt-delta"/g)).toHaveLength(3);
    expect(tight(html)).toContain('<dl class="cmt-tiles"><div class="cmt-tile"><dt>CSS</dt>');
    expect(html).toContain('<span class="cmt-progress">');
    expect(html).toContain('<table class="cmt-stats">');
    expect(html).toContain("Tests &amp; docs");
  });

  for (const [name, render] of Object.entries(renderers))
    it(`renders the same markup in ${name}`, async () => {
      const out = normalize(await render(value));
      for (const part of html.match(/<span class="cmt-(?:delta|progress)".*?<\/span><\/span>/g) ??
        [])
        expect(out).toContain(part);
      expect(out).toContain('<table class="cmt-stats">');
      expect(tight(out)).toContain(tight(html).match(/<dl class="cmt-tiles">.*?<\/dl>/)?.[0]);
    });

  it("ships Svelte components that compile", async () => {
    for (const file of ["Delta.svelte", "ProgressBar.svelte", "StatTiles.svelte"]) {
      const source = await readFile(new URL(`../src/svelte/${file}`, import.meta.url), "utf8");
      expect(() => compile(source, { filename: file, generate: "server" })).not.toThrow();
    }
  });
});
