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
import gitGraph from "../src/index.ts";
import { components as htmlComponents } from "../src/html.ts";
import { components as reactComponents } from "../src/react.ts";
import { components as vueComponents } from "../src/vue.ts";

const stack = await readFile(new URL("fixtures/stack.txt", import.meta.url), "utf8");
const markdown = `::git-graph{title="Ducks & geese"}\n\`\`\`\n${stack.trimEnd()}\n\`\`\`\n#footer\nMerge the stack from the bottom.\n::`;
// Drops what differs only in serialization: comments, line breaks between tags, empty attributes, and the HTML
// renderer's inline styles.
const normalize = (html: string) =>
  html
    .replace(/ (data-[a-z-]+)=""/g, " $1")
    .replace(/<!--.*?-->/g, "")
    .replace(/<style[^>]*>.*?<\/style>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/\s*\n\s*/g, "")
    .trim();
const renderers = {
  vue: (value: MarkdownDocument) =>
    renderVue(createSSRApp({ render: () => h(VueDocument, { value, components: vueComponents }) })),
  react: (value: MarkdownDocument) =>
    renderReact(createElement(ReactDocument, { value, components: reactComponents })),
};

describe("comark-git-graph renderers", async () => {
  const value = await parseMarkdown(markdown, { plugins: [gitGraph()] });
  const expected = normalize(await renderHtmlFromDocument(value, { components: htmlComponents }));

  it("renders the frame, the lines, the rows, and the footer in HTML", () => {
    expect(expected).toContain(
      '<figure class="cgg" data-comark-frame data-not-typeset aria-label="Ducks & geese"><div class="cgg-head">',
    );
    expect(expected).toContain('<div class="cgg-lines"><svg viewBox="0 0 46 ');
    expect(expected).toContain('<div class="cgg-footer">Merge the stack from the bottom.</div>');
  });

  for (const [name, render] of Object.entries(renderers))
    it(`renders the same markup in ${name}`, async () => {
      expect(normalize(await render(value))).toContain(expected);
    });

  for (const file of ["GitGraph.svelte", "GitGraphLines.svelte"])
    it(`ships ${file}, which compiles`, async () => {
      const source = await readFile(new URL(`../src/svelte/${file}`, import.meta.url), "utf8");
      expect(() => compile(source, { filename: file, generate: "server" })).not.toThrow();
    });
});
