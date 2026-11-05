// The Comark plugins that @vite-hub/docs parses every page with, on the server: for the page route, search, and drafts.
import { renderHtmlFromDocument } from "@comark/html";
import { defineComarkPlugin, type ElementNode, type Node } from "comark";
import { textContent } from "comark/utils";
import comarkUi from "comark-ui/vue";
import { createDocsParser, type DocsParserOptions } from "@vite-hub/docs/server";
import { browserPlugins, components as html } from "./plugins.ts";

const isElement = (node: Node): node is ElementNode =>
  Array.isArray(node) && typeof node[0] === "string";

// annotate, diff, quiz, and comments have only an HTML renderer, so their blocks reach the page as the HTML it draws.
// The Vue components are named in PascalCase, `Tabs` for `tabs`.
const name = (tag: string) => tag.replaceAll("-", "").toLowerCase();
const vue = new Set(Object.keys(comarkUi().components).map(name));
// comark-links' `span` only fixes how the HTML renderer writes `aria-hidden`, which Vue writes right.
const htmlOnly = Object.keys(html).filter((tag) => tag !== "span" && !vue.has(name(tag)));
const bridge = defineComarkPlugin(() => {
  const visit = async (nodes: Node[]): Promise<void> => {
    for (const [at, node] of nodes.entries()) {
      if (!isElement(node)) continue;
      if (htmlOnly.includes(node[0])) {
        nodes[at] = [
          "comark-html",
          { html: await renderHtmlFromDocument({ nodes: [node] }, { components: html }) },
        ];
        continue;
      }
      // SAFETY: an element node is [tag, attributes, ...children].
      await visit(node.slice(2) as Node[]);
    }
  };
  return { name: "docs-html-only", post: (state) => visit(state.tree.nodes) };
});

// The pages measure `:time` from one moment, in English and UTC, so their examples read the same wherever the site is built.
const blocks = () => [
  // The docs shell styles prose. Scoped preset styles are lost when zoom copies a block into its dialog.
  ...browserPlugins(
    { "comark-time": { now: "2026-11-04T12:00:00Z", timeZone: "UTC", locale: "en" } },
    { typeset: false },
  ),
  bridge(),
];

// `:::example` shows its fenced Markdown twice, rendered and as code. The rendered copy is parsed here so the page
// reaches the browser as nodes.
const examples = defineComarkPlugin(() => {
  const parse = createDocsParser({ plugins: blocks() });
  const visit = async (nodes: Node[]): Promise<void> => {
    for (const node of nodes) {
      if (!isElement(node)) continue;
      if (node[0] === "example" || node[0] === "correct" || node[0] === "incorrect") {
        // SAFETY: an element node is [tag, attributes, ...children].
        const pre = (node.slice(2) as Node[]).find(
          (child): child is ElementNode => isElement(child) && child[0] === "pre",
        );
        // A Doctor example can be broken on purpose, such as invalid frontmatter, so it shows its source alone.
        const preview = pre && (await parse(textContent(pre)).catch(() => undefined));
        if (preview) node.splice(2, 0, ["example-preview", {}, ...preview.nodes]);
        continue;
      }
      // SAFETY: an element node is [tag, attributes, ...children].
      await visit(node.slice(2) as Node[]);
    }
  };
  return { name: "docs-examples", post: (state) => visit(state.tree.nodes) };
});

export default { plugins: [...blocks(), examples()] } satisfies DocsParserOptions;
