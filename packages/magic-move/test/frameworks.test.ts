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
import magicMove from "../src/index.ts";
import { components as htmlComponents } from "../src/html.ts";
import { components as reactComponents } from "../src/react.ts";
import { components as vueComponents } from "../src/vue.ts";

const fence = "```";
const parse = () =>
  parseMarkdown(
    `::magic-move{title="Refactor" #id .wide}\n${fence}ts [Start]\nconst x = 1\n${fence}\n\n${fence}ts\nconst y = 2\n${fence}\n::`,
    { plugins: [magicMove()] },
  );
const renderers = {
  html: (value: MarkdownDocument) => renderHtmlFromDocument(value, { components: htmlComponents }),
  vue: (value: MarkdownDocument) =>
    renderVue(createSSRApp({ render: () => h(VueDocument, { value, components: vueComponents }) })),
  react: (value: MarkdownDocument) =>
    renderReact(createElement(ReactDocument, { value, components: reactComponents })),
};

describe("comark-magic-move renderers", () => {
  it("renders the same steps and controls in every renderer", async () => {
    const value = await parse();
    for (const [name, render] of Object.entries(renderers)) {
      // Up to the HTML renderer's inline styles and script, whose source mentions attributes of its own.
      const [html = ""] = (await render(value)).split("<style");
      const [, id] = /id="(cmv-[a-z0-9]+-1)-tab-1"/.exec(html) ?? [];
      expect(html, name).toContain(
        '<div class="cmv"><div class="cmv-list" role="tablist" aria-label="Refactor"><button type="button" class="cmv-tab" role="tab"',
      );
      expect(html, name).toContain(
        `id="${id}-tab-2" aria-controls="${id}-panel-2" aria-selected="false" tabindex="-1">Step 2</button>`,
      );
      expect(html, name).toContain(
        `<div class="cmv-step" role="tabpanel" id="${id}-panel-1" aria-labelledby="${id}-tab-1" tabindex="0"><div class="cmv-caption">Start</div>`,
      );
      expect(html, name).toMatch(
        new RegExp(
          `id="${id}-panel-2" aria-labelledby="${id}-tab-2" tabindex="0" data-inactive(="")?><div class="cmv-caption">Step 2</div>`,
        ),
      );
      expect(html, name).not.toMatch(/wide|id="id"|undefined/);
    }
  });

  it("ships Svelte components that compile", async () => {
    for (const name of ["MagicMove", "MagicMoveStep"]) {
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
