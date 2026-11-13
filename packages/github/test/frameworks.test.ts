import { readFile } from "node:fs/promises";
import { MarkdownDocument as ReactDocument } from "@comark/react";
import { MarkdownDocument as VueDocument } from "@comark/vue";
import { createHtmlRenderer } from "@comark/html";
import { parseMarkdown } from "comark";
import { createElement } from "react";
import { renderToString as renderReact } from "react-dom/server";
import { compile } from "svelte/compiler";
import { describe, expect, it } from "vite-plus/test";
import { createSSRApp, h } from "vue";
import { renderToString as renderVue } from "vue/server-renderer";
import { callouts } from "../src/index.ts";
import { components as htmlComponents } from "../src/html.ts";
import { components as reactComponents } from "../src/react.ts";
import { components as vueComponents } from "../src/vue.ts";

const markdown =
  '> [!WARNING] Heads up\n> Read **this**.\n\n::tip{title="Faster"}\nUse **pnpm**.\n::';
const parse = () => parseMarkdown(markdown, { plugins: [callouts()] });
// Drops what differs only in serialization: comments, whitespace between tags, and the HTML renderer's inline styles.
const normalize = (html: string) =>
  html
    .replace(/ data-comark-frame=""/g, " data-comark-frame")
    .replace(/<!--.*?-->/g, "")
    .replace(/<style[^>]*>.*?<\/style>/g, "")
    .replace(/>\s+</g, "><")
    .replace(/\s+/g, " ")
    .trim();

describe("comark-github renderers", async () => {
  const expected = normalize(
    await createHtmlRenderer({ plugins: [callouts()], components: htmlComponents })(markdown),
  );

  it("renders the same markup in Vue", async () => {
    const value = await parse();
    const html = await renderVue(
      createSSRApp({ render: () => h(VueDocument, { value, components: vueComponents }) }),
    );
    expect(normalize(html)).toContain(expected);
  });

  it("renders the same markup in React", async () => {
    const value = await parse();
    const html = renderReact(createElement(ReactDocument, { value, components: reactComponents }));
    expect(normalize(html)).toContain(expected);
  });

  it("ships a Svelte component that compiles", async () => {
    const source = await readFile(
      new URL("../src/svelte/GithubCallout.svelte", import.meta.url),
      "utf8",
    );
    expect(() =>
      compile(source, { filename: "GithubCallout.svelte", generate: "server" }),
    ).not.toThrow();
  });
});
