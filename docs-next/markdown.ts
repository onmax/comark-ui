// The Comark plugins that @vite-hub/docs parses every page with: on the server, for the page route, search, and drafts.
import { defineComarkPlugin, type ElementNode, type Node } from "comark";
import { textContent } from "comark/utils";
import carousel from "comark-carousel";
import charts from "comark-charts";
import { callouts } from "comark-github";
import tabs from "comark-tabs";
import zoom from "comark-zoom";
import { createDocsParser, type DocsParserOptions } from "@vite-hub/docs/server";

const blocks = () => [callouts(), tabs(), carousel(), charts(), zoom()];

const isElement = (node: Node): node is ElementNode =>
  Array.isArray(node) && typeof node[0] === "string";

// `:::example` shows its fenced Markdown twice, rendered and as code, like the old site. The rendered copy is parsed
// here so the page reaches the browser as nodes.
const examples = defineComarkPlugin(() => {
  const parse = createDocsParser({ plugins: blocks() });
  const visit = async (nodes: Node[]): Promise<void> => {
    for (const node of nodes) {
      if (!isElement(node)) continue;
      if (node[0] === "example") {
        const pre = node
          .slice(2)
          .find((child): child is ElementNode => isElement(child) && child[0] === "pre");
        if (pre)
          node.splice(2, 0, ["example-preview", {}, ...(await parse(textContent(pre))).nodes]);
        continue;
      }
      // SAFETY: an element node is [tag, attributes, ...children].
      await visit(node.slice(2) as Node[]);
    }
  };
  return { name: "docs-examples", post: (state) => visit(state.tree.nodes) };
});

export default { plugins: [...blocks(), examples()] } satisfies DocsParserOptions;
