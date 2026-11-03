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
import tabs from "../src/index.ts";
import { createIcons, type IconCollection } from "comark-icon";
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
// Drops what differs only in serialization: comments, whitespace, empty attribute values, the HTML renderer's inline
// styles and script, and the ids, which each framework makes its own way.
const normalize = (html: string) =>
  html
    .replace(/<style[^>]*>.*?<\/style>|<script>.*?<\/script>/gs, "")
    .replace(/<!--.*?-->/g, "")
    .replace(/(id|aria-controls|aria-labelledby)="[^"]*?-(tab|panel)-(\d)"/g, '$1="$2-$3"')
    .replace(/=""/g, "")
    .replace(/>\s+</g, "><")
    .replace(/\s+/g, " ")
    .trim();

describe("comark-tabs renderers", () => {
  it("renders the same tabs and code group in every renderer", async () => {
    const value = await parseMarkdown(
      '::tabs{sync="os" #setup .wide}\n:::tabs-item{label="macOS"}\nPress **⌘K**.\n:::\n\n:::tabs-item{label="Windows"}\nPress Ctrl+K.\n:::\n::\n\n::code-group\n```bash [pnpm]\npnpm add x\n```\n\n```bash [npm]\nnpm i x\n```\n::',
      { plugins: [tabs()] },
    );
    const expected = normalize(await renderers.html(value));
    expect(expected).toContain(
      '<div class="ct-panel" role="tabpanel" id="panel-2" aria-labelledby="tab-2" tabindex="0" data-inactive><div class="ct-caption">Windows</div>',
    );
    expect(expected).toContain(
      '<div class="ct" data-tabs-code data-code-header data-tabs-magic="auto"><div class="ct-list" role="tablist">',
    );
    for (const name of ["vue", "react"] as const) {
      const html = normalize(await renderers[name](value));
      expect(html, name).toContain(expected);
      expect(html, name).not.toMatch(/setup|wide|undefined|labels=/);
    }
  });

  it("renders a code group's magic mode the same in every renderer", async () => {
    const value = await parseMarkdown(
      '::code-group{magic sync="imports"}\n```ts [YAML]\nimport yaml from "tinyaml/js-yaml";\n```\n\n```ts [INI]\nimport ini from "tinyini/ini";\n```\n::',
      { plugins: [tabs()] },
    );
    for (const [name, render] of Object.entries(renderers)) {
      const html = normalize(await render(value));
      expect(html, name).toContain(
        'data-code-header data-tabs-magic="always" data-tabs-sync="imports"',
      );
      expect(html.replace(/&quot;/g, '"'), name).toContain('import ini from "tinyini/ini";');
    }
  });

  it("draws icons the same in every renderer", async () => {
    const logos: IconCollection = {
      prefix: "logos",
      icons: { pnpm: { body: '<path fill="#f9ad00" d="M0 0h8v8H0z"/>' } },
    };
    const lucide: IconCollection = {
      prefix: "lucide",
      icons: { apple: { body: '<path stroke="currentColor" d="M1 1"/>' } },
    };
    const value = await parseMarkdown(
      '::tabs\n:::tabs-item{label="A" icon="lucide:apple"}\nA\n:::\n\n:::tabs-item{label="B"}\nB\n:::\n::\n\n::code-group\n```sh [pnpm] icon=logos:pnpm\na\n```\n::',
      { plugins: [tabs({ iconResolver: createIcons({ collections: { logos, lucide } }) })] },
    );
    // Each framework writes the quotes in a style, and an empty attribute, its own way.
    const quotes = (html: string) =>
      normalize(html)
        .replace(/&quot;|&#34;|&#39;|&#x27;|"(?=\)|\()/g, "'")
        .replace(/;"/g, '"')
        .replace(/ data-mask(?!=)/g, " data-mask");
    const expected = quotes(await renderers.html(value));
    expect(expected.match(/class="ci"/g)).toHaveLength(4);
    expect(expected).toContain('<span class="ci" data-mask aria-hidden="true" style="--ci:url(');
    for (const name of ["vue", "react"] as const)
      expect(quotes(await renderers[name](value)), name).toContain(expected);
  });

  it("gives the tabs and panels of a block matching ids", async () => {
    const value = await parseMarkdown('::tabs\n:::tabs-item{label="A"}\nA\n:::\n::', {
      plugins: [tabs()],
    });
    for (const [name, render] of Object.entries(renderers)) {
      const html = await render(value);
      const [, id] = /role="tab" id="([^"]+)-tab-1"/.exec(html) ?? [];
      expect(id, name).toBeTruthy();
      expect(html, name).toContain(`aria-controls="${id}-panel-1"`);
      expect(html, name).toContain(`id="${id}-panel-1" aria-labelledby="${id}-tab-1"`);
    }
  });

  it("ships Svelte components that compile", async () => {
    for (const name of ["Tabs", "TabsItem"]) {
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
