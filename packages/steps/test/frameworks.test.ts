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
import steps from "../src/index.ts";
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
// Drops what differs only in serialization: comments, whitespace, the HTML renderer's inline styles, and a style's
// trailing semicolon.
const normalize = (html: string) =>
  html
    .replace(/<style[^>]*>.*?<\/style>/gs, "")
    .replace(/<!--.*?-->/g, "")
    .replace(/;"/g, '"')
    .replace(/>\s+</g, "><")
    .replace(/\s+/g, " ")
    .trim();

describe("comark-steps renderers", () => {
  it("renders the same steps in every renderer", async () => {
    const value = await parseMarkdown(
      "::steps{#setup .wide}\n### Install\nRun **this**.\n\n### Configure\nEdit it.\n::\n\n::steps\n2. Clone\n3. Build\n::",
      { plugins: [steps()] },
    );
    const expected = normalize(await renderers.html(value));
    expect(expected).toContain(
      '<ol class="cs"><li class="cs-step"><h3 id="install">Install</h3><p>Run <strong>this</strong>.</p></li>',
    );
    expect(expected).toContain(
      '<ol class="cs" start="2" style="counter-reset:cs-step 1"><li class="cs-step">Clone</li>',
    );
    for (const name of ["vue", "react"] as const) {
      const html = normalize(await renderers[name](value));
      expect(html, name).toContain(expected);
      expect(html, name).not.toMatch(/setup|wide|undefined|index=/);
    }
  });

  it("ships Svelte components that compile", async () => {
    for (const name of ["Steps", "Step"]) {
      const source = await readFile(
        new URL(`../src/svelte/${name}.svelte`, import.meta.url),
        "utf8",
      );
      expect(() =>
        compile(source, { filename: `${name}.svelte`, generate: "server" }),
      ).not.toThrow();
    }
  });
});
