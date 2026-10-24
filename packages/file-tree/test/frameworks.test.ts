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
import fileTree from "../src/index.ts";
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
    .replace(/ open="true"/g, " open")
    .replace(/>\s+</g, "><")
    .replace(/\s+/g, " ")
    .trim();

describe("comark-file-tree renderers", () => {
  it("renders the same tree in every renderer", async () => {
    const value = await parseMarkdown(
      "::file-tree{#files .wide}\n```\nsrc/\n  + new.ts  # added\n  ~ app.vue\n  ...\n- old.ts\n```\n::",
      { plugins: [fileTree()] },
    );
    const expected = normalize(await renderers.html(value));
    expect(expected).toContain('<details open><summary><span class="cft-entry"><svg');
    for (const name of ["vue", "react"] as const) {
      const html = normalize(await renderers[name](value));
      expect(html, name).toContain(expected);
      expect(html, name).not.toMatch(/files|wide|undefined/);
    }
  });

  it("draws icons the same in every renderer", async () => {
    const files: IconCollection = {
      prefix: "files",
      icons: { vue: { body: '<path stroke="currentColor" d="M1 1"/>' } },
    };
    const value = await parseMarkdown("::file-tree\n```\nApp.vue\n```\n::", {
      plugins: [
        fileTree({
          iconResolver: createIcons({ collections: { files } }),
          icons: { ".vue": "files:vue" },
        }),
      ],
    });
    const expected = normalize(await renderers.html(value));
    expect(expected).toContain('<span class="ci" data-mask aria-hidden="true" style="--ci:url(');
    for (const name of ["vue", "react"] as const)
      expect(normalize(await renderers[name](value)), name).toContain(expected);
  });

  it("ships Svelte components that compile", async () => {
    for (const name of ["FileTree", "FileTreeItem"]) {
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
