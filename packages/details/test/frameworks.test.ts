import { readFile } from "node:fs/promises";
import { renderHtmlFromDocument } from "@comark/html";
import { MarkdownDocument as ReactDocument } from "@comark/react";
import { MarkdownDocument as VueDocument } from "@comark/vue";
import { type MarkdownDocument, parseMarkdown } from "comark";
import { createIcons, type IconCollection } from "comark-icon";
import { createElement } from "react";
import { renderToString as renderReact } from "react-dom/server";
import { compile } from "svelte/compiler";
import { describe, expect, it } from "vite-plus/test";
import { createSSRApp, h } from "vue";
import { renderToString as renderVue } from "vue/server-renderer";
import details from "../src/index.ts";
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
// Drops what differs only in serialization: comments, whitespace, the HTML renderer's inline styles, the way each
// framework writes an empty attribute, and quotes in a style.
const normalize = (html: string) =>
  html
    .replace(/<style[^>]*>.*?<\/style>/gs, "")
    .replace(/<!--.*?-->/g, "")
    .replace(/&quot;|&#34;|&#39;|&#x27;|"(?=\)|\()/g, "'")
    .replace(/;"/g, '"')
    .replace(/=""/g, "")
    .replace(/>\s+</g, "><")
    .replace(/\s+/g, " ")
    .trim();

describe("comark-details renderers", () => {
  it("renders the same details, accordion, and collapsible in every renderer", async () => {
    const lucide: IconCollection = {
      prefix: "lucide",
      icons: { apple: { body: '<path stroke="currentColor" d="M1 1"/>' } },
    };
    const value = await parseMarkdown(
      '::details{summary="Why?" #why .wide}\nBecause **so**.\n::\n\n::accordion{type="single" defaultValue="0"}\n:::accordion-item{label="A" icon="lucide:apple"}\nOne.\n:::\n\n:::accordion-item{label="B"}\nTwo.\n:::\n::\n\n::collapsible{name="options"}\nHidden.\n::',
      { plugins: [details({ iconResolver: createIcons({ collections: { lucide } }) })] },
    );
    const expected = normalize(await renderers.html(value));
    expect(expected).toContain('<details class="cdt" data-variant="item" name="cdt-');
    expect(expected).toContain('<span class="ci" data-mask aria-hidden="true" style="--ci:url(');
    for (const name of ["vue", "react"] as const) {
      const html = normalize(await renderers[name](value));
      expect(html, name).toContain(expected);
      expect(html, name).not.toMatch(/why|wide|undefined/);
    }
  });

  it("ships Svelte components that compile", async () => {
    for (const name of ["Accordion", "Disclosure", "DisclosureSummary"]) {
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
