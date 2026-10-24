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
import tests from "../src/index.ts";
import { components as htmlComponents } from "../src/html.ts";
import { components as reactComponents } from "../src/react.ts";
import { components as vueComponents } from "../src/vue.ts";

const markdown =
  '::tests{title="Ducks & geese"}\n```xml\n<testsuite time="1.5"><testcase classname="pond" name="counts" /><testcase name="maps"><failure message="nope">at pond.ts:1</failure></testcase><testcase name="later"><skipped/></testcase></testsuite>\n```\n::';
// Drops what differs only in serialization: comments, line breaks between tags, and the HTML renderer's inline styles.
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

describe("comark-tests renderers", async () => {
  const value = await parseMarkdown(markdown, { plugins: [tests()] });
  const expected = normalize(await renderHtmlFromDocument(value, { components: htmlComponents }));

  it("renders the summary and the failure in HTML", () => {
    expect(expected).toContain(
      '<section class="ctr" data-status="failed" aria-label="Ducks & geese">',
    );
    expect(expected).toContain('<details class="ctr-failure"><summary>maps</summary>');
  });

  for (const [name, render] of Object.entries(renderers))
    it(`renders the same markup in ${name}`, async () => {
      expect(normalize(await render(value))).toContain(expected);
    });

  it("ships a Svelte component that compiles", async () => {
    const source = await readFile(new URL("../src/svelte/Tests.svelte", import.meta.url), "utf8");
    expect(() => compile(source, { filename: "Tests.svelte", generate: "server" })).not.toThrow();
  });
});
