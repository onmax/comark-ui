// The Comark plugins that @vite-hub/docs parses every page with, on the server: for the page route, search, and drafts.
import { renderHtmlFromDocument } from "@comark/html";
import { defineComarkPlugin, type ElementNode, type Node } from "comark";
import { textContent } from "comark/utils";
import { components as vueComponents } from "comark-ui/vue";
import { createDocsParser, type DocsParserOptions } from "@vite-hub/docs/server";
import { playable, playLink } from "./play-link.ts";
import { browserPlugins, components as html } from "./plugins.ts";
import { studioPlugin } from "./studio.ts";

const isElement = (node: Node): node is ElementNode =>
  Array.isArray(node) && typeof node[0] === "string";

// annotate, diff, quiz, and comments have only an HTML renderer, so their blocks reach the page as the HTML it draws.
// The Vue components are named in PascalCase, `Tabs` for `tabs`.
const name = (tag: string) => tag.replaceAll("-", "").toLowerCase();
const vue = new Set(Object.keys(vueComponents).map(name));
// comark-links' `span` only fixes how the HTML renderer writes `aria-hidden`, which Vue writes right.
const htmlOnly = Object.keys(html).filter((tag) => tag !== "span" && !vue.has(name(tag)));
// A chart's notes are comark-annotate marks, which only the HTML renderer draws, so a chart with any goes as HTML too.
const needsHtml = (node: ElementNode) =>
  htmlOnly.includes(node[0]) || (node[0] === "chart" && Array.isArray(node[1].marks));
const bridge = defineComarkPlugin(() => {
  const visit = async (nodes: Node[]): Promise<void> => {
    for (const [at, node] of nodes.entries()) {
      if (!isElement(node)) continue;
      if (needsHtml(node)) {
        nodes[at] = [
          "comark-html",
          {
            html: await renderHtmlFromDocument({ nodes: [node] }, { components: html }),
            block: node[0],
          },
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
const timeNow = { now: "2026-11-04T12:00:00Z", timeZone: "UTC", locale: "en" };
// The docs shell styles prose. Scoped preset styles are lost when zoom copies a block into its dialog.
const blocks = () => [...browserPlugins({ "comark-time": timeNow }, { typeset: false }), bridge()];

// `:::example` shows its fenced Markdown twice, rendered and as code. The rendered copy is parsed here so the page
// reaches the browser as nodes, and the playground link, which deflates the Markdown, is written here too.
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
        const source = pre && textContent(pre);
        const preview = source ? await parse(source).catch(() => undefined) : undefined;
        if (preview) node.splice(2, 0, ["example-preview", {}, ...preview.nodes]);
        // An example opens in the playground with its Markdown; a Doctor rule's doesn't.
        if (node[0] === "example" && source && playable(source))
          node[1].play = await playLink(source);
        continue;
      }
      // SAFETY: an element node is [tag, attributes, ...children].
      await visit(node.slice(2) as Node[]);
    }
  };
  return { name: "docs-examples", post: (state) => visit(state.tree.nodes) };
});

// `#51` in the landing's studio links to this repository's issues.
const studio = studioPlugin(() => [
  ...browserPlugins(
    { "comark-time": timeNow, "comark-github": { references: { repo: "onmax/comark-ui" } } },
    { typeset: false },
  ),
  bridge(),
]);

export default { plugins: [...blocks(), examples(), studio] } satisfies DocsParserOptions;
