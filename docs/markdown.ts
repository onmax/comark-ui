// The Comark plugins that @vite-hub/docs parses every page with, on the server: for the page route, search, and drafts.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { renderHtmlFromDocument } from "@comark/html";
import { defineComarkPlugin, type ElementNode, type Node } from "comark";
import { components as vueComponents } from "comark-ui/vue";
import type { DocsParserOptions } from "@vite-hub/docs/server";
import { playable, playLink } from "./play-link.ts";
import { browserPlugins, components as html } from "./plugins.ts";
import { studioPlugin } from "./studio.ts";
import { sizeOf } from "../packages/zoom/src/size.ts";
import bundle from "../packages/bundle/src/index.ts";

const isElement = (node: Node): node is ElementNode =>
  Array.isArray(node) && typeof node[0] === "string";

// @vite-hub/docs draws the blocks that have only an HTML renderer (annotate, diff, quiz, and comments) after every
// plugin, in a `comark-html` node that its `ComarkHtml` shows. The studio's blocks are parsed apart from the page and
// timed as HTML in the studio plugin, so the studio draws them here first.
// A chart's notes are comark-annotate marks, which only the HTML renderer draws. @vite-hub/docs draws such a chart as
// HTML too, but its DocsMarkdown gives a `comark-html` node whose `block` has a Vue component back to that component,
// which draws no marks. So a chart with notes is drawn here, and names its block only in `data-block`. Drop that half
// once @vite-hub/docs keeps the HTML.
// The Vue components are named in PascalCase, `Tabs` for `tabs`.
const name = (tag: string) => tag.replaceAll("-", "").toLowerCase();
const vue = new Set(Object.keys(vueComponents).map(name));
// comark-links' `span` only fixes how the HTML renderer writes `aria-hidden`, which Vue writes right.
const htmlOnly = Object.keys(html).filter((tag) => tag !== "span" && !vue.has(name(tag)));
const marked = (node: ElementNode) =>
  node[0] === "chart" && Array.isArray(node[1].marks) && node[1].marks.length > 0;
const bridge = defineComarkPlugin((all: boolean = true) => {
  const visit = async (nodes: Node[]): Promise<void> => {
    for (const [at, node] of nodes.entries()) {
      if (!isElement(node)) continue;
      if ((all && htmlOnly.includes(node[0])) || marked(node)) {
        const drawn = await renderHtmlFromDocument({ nodes: [node] }, { components: html });
        nodes[at] = [
          "comark-html",
          marked(node) ? { html: drawn, "data-block": node[0] } : { html: drawn, block: node[0] },
        ];
        continue;
      }
      // SAFETY: an element node is [tag, attributes, ...children].
      await visit(node.slice(2) as Node[]);
    }
  };
  return {
    name: all ? "docs-studio-html" : "docs-chart-marks",
    post: (state) => visit(state.tree.nodes),
  };
});

// comark-zoom can't measure an image of the site's own, such as `/before.png`, from its path, so the image took its room
// only once it loaded and pushed the page down. Its size is read from docs/public instead. Nitro bundles this file, so
// the folder is found from the working directory, where the docs scripts run. The Worker that parses drafts has no
// files, so a draft's image keeps no size.
const localSize = async (src: string) =>
  sizeOf(
    await readFile(
      new URL(`.${src.split(/[?#]/)[0]}`, pathToFileURL(join(process.cwd(), "public/"))),
    ),
  );
const sizes = defineComarkPlugin(() => {
  const visit = async (nodes: Node[]): Promise<void> => {
    for (const node of nodes) {
      if (!isElement(node)) continue;
      const { src, width, height } = node[1];
      if (
        node[0] === "img" &&
        typeof src === "string" &&
        /^\/(?!\/)/.test(src) &&
        !(width && height)
      ) {
        const size = await localSize(src).catch(() => undefined);
        if (size) Object.assign(node[1], size);
      }
      // SAFETY: an element node is [tag, attributes, ...children].
      await visit(node.slice(2) as Node[]);
    }
  };
  return { name: "docs-image-sizes", post: (state) => visit(state.tree.nodes) };
});

// The bundle examples measure two made-up builds of comark-bundle's test fixtures, found from the working directory as
// the images are. The playground and the Worker have no disk, so a `::bundle` there reports it reads nothing.
const builds = join(process.cwd(), "../packages/bundle/test/fixtures/vite");

// The pages measure `:time` from one moment, in English and UTC, so their examples read the same wherever the site is built.
const timeNow = { now: "2026-11-04T12:00:00Z", timeZone: "UTC", locale: "en" };
// The docs shell styles prose. Scoped preset styles are lost when zoom copies a block into its dialog.
const blocks = () => [
  sizes(),
  ...browserPlugins({ "comark-time": timeNow }, { typeset: false }).map((plugin) =>
    plugin.name === "comark-bundle" ? bundle({ root: builds }) : plugin,
  ),
  bridge(false),
];

// `#51` in the landing's studio links to this repository's issues.
const studio = studioPlugin(() => [
  ...browserPlugins(
    { "comark-time": timeNow, "comark-github": { references: { repo: "onmax/comark-ui" } } },
    { typeset: false },
  ),
  bridge(),
]);

export default {
  plugins: [...blocks(), studio],
  // An example opens in the playground with its Markdown; a Doctor rule's `::correct` and `::incorrect` don't.
  examples: {
    play: (source, tag) => (tag === "example" && playable(source) ? playLink(source) : undefined),
  },
} satisfies DocsParserOptions;
