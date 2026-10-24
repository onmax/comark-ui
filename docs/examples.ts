// Every example the docs show, as one list: each package page's `::examples` panels, then each recipe's first
// `::example`. The landing's canvas and the playground both read it, so neither has an example the other lacks.
import { fileURLToPath } from "node:url";
import { registerSource, splitSource, useSource } from "@vite-hub/source";
import { glob } from "@vite-hub/source/glob";
import type { ElementNode, Node } from "comark";
import { parseMarkdown } from "comark";
import { textContent } from "comark/utils";

export interface Example {
  id: string;
  /** The package's slug, or "recipes". */
  group: string;
  /** The page's slug, such as "charts/syntax" or "recipes/review". */
  page: string;
  label: string;
  /** The Markdown in the example's fenced block. */
  source: string;
  /** An include reads files, so the playground can't run it. */
  playable: boolean;
}

// A package's pages in the order its column lists them, and the recipes in theirs; other pages have no place in the
// rail.
export const pageOrder = [
  "",
  "getting-started",
  "components",
  "syntax",
  "guides",
  "theming",
  "vite-doctor",
];
export const recipeOrder = ["review", "pull-request", "share", "zoom", "carousel"];
// Third-party plugins the preset registers, by slug and npm name. They sit in the rail like a package, but have no
// folder in packages/, so their pages sit in docs/pages/<slug>/.
export const thirdParty: Record<string, string> = { mermaid: "comark-pele" };

const isElement = (node: Node): node is ElementNode => Array.isArray(node) && node[0] !== null;
const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// packages/<package>/docs/<page>.md, docs/pages/<third-party>/<page>.md, or docs/pages/recipes/<recipe>.md, as the
// site's slug and group.
function pageOf(file: string) {
  const recipe = /^docs\/pages\/(recipes\/[\w-]+)\.md$/.exec(file);
  if (recipe) return { group: "recipes", page: recipe[1] };
  const [, inPackages, inPages, name = ""] =
    /^(?:packages\/([\w-]+)\/docs|docs\/pages\/([\w-]+))\/([\w-]+)\.md$/.exec(file) ?? [];
  const group = inPackages ?? inPages ?? "";
  return { group, page: name === "index" ? group : `${group}/${name}` };
}

const examples = registerSource(
  "comark-examples",
  splitSource({
    source: glob({
      include: [
        "packages/*/docs/*.md",
        ...Object.keys(thirdParty).map((slug) => `docs/pages/${slug}/*.md`),
        "docs/pages/recipes/*.md",
      ],
    }),
    async split(file) {
      const { group, page } = pageOf(file.key);
      const { nodes } = await parseMarkdown(
        typeof file.content === "string" ? file.content : new TextDecoder().decode(file.content),
      );
      const blocks = nodes.filter(isElement);
      const panels =
        group === "recipes"
          ? blocks.filter(([tag]) => tag === "example").slice(0, 1)
          : blocks
              .filter(([tag]) => tag === "examples")
              .flatMap(([, , ...children]) => children.filter(isElement));
      return panels.map(([, attrs, ...children]) => {
        const label = typeof attrs.label === "string" ? attrs.label : "";
        const pre = children.find((child) => isElement(child) && child[0] === "pre");
        if (!pre) throw new Error(`${file.key}: the example "${label}" needs a fenced code block.`);
        const source = textContent(pre);
        const id = group === "recipes" ? page.replace("/", "-") : `${group}-${slugify(label)}`;
        return {
          key: id,
          data: {
            id,
            group,
            page,
            label,
            source,
            playable: !/^:+include\b/m.test(source),
          } satisfies Example,
        };
      });
    },
  }),
);

declare global {
  interface ViteHubSourceMap {
    "comark-examples": typeof examples;
  }
}

/** Every example, in the rail's order: `packageOrder`'s packages, each one's pages, then the recipes. */
export async function loadExamples(packageOrder: readonly string[]): Promise<Example[]> {
  const items = await useSource("comark-examples", {
    rootDir: fileURLToPath(new URL("../", import.meta.url)),
  }).items();
  const rank = ({ group, page }: Example) => {
    const name = page.slice(group.length + 1);
    return group === "recipes"
      ? [packageOrder.length, recipeOrder.indexOf(name)]
      : [packageOrder.indexOf(group), pageOrder.indexOf(name)];
  };
  // Pages outside the rail, and packages outside packageOrder, aren't on the site.
  const listed = items
    .flatMap((item) => (item.data ? [item.data] : []))
    .filter((example) => rank(example).every((place) => place >= 0));
  // A stable sort keeps each page's examples in document order.
  return listed.sort((a, b) => {
    const [x, y] = [rank(a), rank(b)];
    return x[0] - y[0] || x[1] - y[1];
  });
}
