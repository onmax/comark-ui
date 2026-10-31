import type { ComarkPlugin, ElementNode, ElementNodeAttributes, Node } from "comark";
import GithubSlugger from "github-slugger";
import convertCommand from "npm-to-yarn";
import { find, html } from "property-information";
import computeReadingTime from "reading-time";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visitParents as visitMdast } from "unist-util-visit-parents";

type Properties = Record<string, unknown>;

const isElement = (node: Node | undefined): node is ElementNode =>
  Array.isArray(node) && node[0] !== null;
const childrenOf = ([, , ...children]: ElementNode): Node[] => children;
// SAFETY: an element is its tag and attributes followed by its children, so from index 2 on it holds only nodes.
const asList = (node: ElementNode): Node[] => node as Node[];
const isString = (value: unknown): value is string => value === String(value);
const fromHtml = (node: ElementNode) => node[1].$?.html === 1;
const HEADING = /^h[1-6]$/;

function textOf(node: Node): string {
  if (!Array.isArray(node)) return node;
  if (!isElement(node)) return "";
  return childrenOf(node).map(textOf).join("");
}

function visit(
  nodes: Node[],
  start: number,
  enter: (node: ElementNode, parent: Node[], index: number) => void,
) {
  for (let index = start; index < nodes.length; index++) {
    const node = nodes[index];
    if (!isElement(node)) continue;
    enter(node, nodes, index);
    visit(asList(node), 2, enter);
  }
}

// hast properties (`ariaHidden`, `className`) as the HTML attributes Comark nodes hold.
function attributes(properties: Properties | undefined): ElementNodeAttributes {
  const out: ElementNodeAttributes = {};
  for (const [key, value] of Object.entries(properties ?? {})) {
    if (value === false || value == null) continue;
    const info = find(html, key);
    // `ariaHidden: true` is `aria-hidden="true"`; only real boolean attributes are written bare.
    // SAFETY: hast property values are strings, numbers, booleans, or lists of them; lists are joined first.
    out[info.attribute] = Array.isArray(value)
      ? value.join(" ")
      : value === true && info.boolean
        ? ""
        : String(value as string | number | boolean);
  }
  return out;
}

interface HastNode {
  type: string;
  tagName?: string;
  properties?: Properties;
  children?: HastNode[];
  value?: string;
}

// A Comark node as the hast element rehype plugins' callbacks expect: properties by hast name, children included.
function toHast(node: Node): HastNode {
  if (!Array.isArray(node)) return { type: "text", value: node };
  if (!isElement(node)) return { type: "text", value: "" };
  const properties: Properties = {};
  for (const [key, value] of Object.entries(node[1])) {
    if (key === "$") continue;
    const info = find(html, key);
    properties[info.property] =
      info.spaceSeparated && isString(value) ? value.split(/\s+/).filter(Boolean) : value;
  }
  return {
    type: "element",
    tagName: node[0],
    properties,
    children: childrenOf(node).map(toHast),
  };
}

type Test = string | string[] | ((element: HastNode) => boolean | undefined | void);
// unist-util-is's element test, as rehype plugins take it: a tag name, a list of them, or a predicate.
const passes = (test: Test | undefined, element: HastNode) =>
  test === undefined ||
  (test instanceof Function
    ? Boolean(test(element))
    : (Array.isArray(test) ? test : [test]).includes(element.tagName!));

// The hast content rehype plugins take as options, as Comark nodes.
function fromHast(node: HastNode | HastNode[]): Node[] {
  if (Array.isArray(node)) return node.flatMap(fromHast);
  if (node.type === "text") return [node.value ?? ""];
  if (node.type === "element") return [elementFromHast(node)];
  return [];
}

const elementFromHast = (node: HastNode): ElementNode => [
  node.tagName!,
  attributes(node.properties),
  ...fromHast(node.children ?? []),
];

/** rehype-slug: heading ids as github-slugger makes them; ids written in the source stay. */
export const slug = (options: { prefix?: string } = {}): ComarkPlugin => ({
  name: "remark-to-comark:slug",
  markdownItPost(state) {
    // Comark has already given every heading an id by the time `post` runs, so the written ones are noted here.
    const explicit: boolean[] = [];
    for (const token of state.tokens) {
      if (token.type === "heading_open")
        explicit.push(Boolean(token.attrs?.some(([name]) => name === "id")));
    }
    state.explicitIds = explicit;
  },
  post(state) {
    const explicit: boolean[] = state.explicitIds ?? [];
    const slugger = new GithubSlugger();
    let markdownHeading = 0;
    visit(state.tree.nodes, 0, (node) => {
      if (!HEADING.test(node[0])) return;
      const written = fromHtml(node)
        ? isString(node[1].id) && node[1].id !== ""
        : (explicit[markdownHeading++] ?? true);
      if (!written) node[1].id = (options.prefix ?? "") + slugger.slug(textOf(node));
    });
  },
});

type Computed<T> = T | ((element: HastNode) => T);
const computed = <T>(option: Computed<T>, element: HastNode): T =>
  option instanceof Function ? option(element) : option;

export interface AutolinkHeadingsOptions {
  behavior?: "prepend" | "append" | "wrap" | "before" | "after";
  properties?: Computed<Properties | undefined>;
  content?: Computed<HastNode | HastNode[] | undefined>;
  headingProperties?: Computed<Properties | undefined>;
  /** For `before` and `after`: an element that wraps the heading and its link. */
  group?: Computed<HastNode | undefined>;
  /** Which headings get a link, as unist-util-is tests a hast element. */
  test?: Test;
}

/** rehype-autolink-headings: a link to each heading's id, placed as `behavior` says. */
export const autolinkHeadings = (options: AutolinkHeadingsOptions = {}): ComarkPlugin => ({
  name: "remark-to-comark:autolink-headings",
  post(state) {
    const behavior = options.behavior ?? "prepend";
    const fallback =
      behavior === "prepend" || behavior === "append" ? { ariaHidden: true, tabIndex: -1 } : {};
    // `wrap` adds no content unless asked; the others default to an icon span.
    const content = (element: HastNode): Node[] => {
      const value = computed(options.content, element);
      return value
        ? fromHast(value)
        : behavior === "wrap"
          ? []
          : [["span", { class: "icon icon-link" }]];
    };
    // Collected first: `before` and `after` insert siblings, which would shift a walk in progress.
    const found: [ElementNode, Node[]][] = [];
    visit(state.tree.nodes, 0, (node, parent) => {
      if (
        HEADING.test(node[0]) &&
        isString(node[1].id) &&
        node[1].id &&
        passes(options.test, toHast(node))
      )
        found.push([node, parent]);
    });
    for (const [node, parent] of found) {
      // Callbacks see the heading as it was; heading properties apply first, so a new id is the one the link points at.
      const element = toHast(node);
      Object.assign(node[1], attributes(computed(options.headingProperties, element)));
      const properties = attributes(computed(options.properties, element) ?? fallback);
      const href = `#${String(node[1].id)}`;
      const children = childrenOf(node);
      node.length = 2;
      if (behavior === "wrap") {
        const wrap: ElementNode = ["a", { ...properties, href }, ...children, ...content(element)];
        node.push(wrap);
        continue;
      }
      const link: ElementNode = ["a", { ...properties, href }, ...content(element)];
      if (behavior === "prepend") node.push(link, ...children);
      else if (behavior === "append") node.push(...children, link);
      else {
        node.push(...children);
        const index = parent.indexOf(node);
        const pair = behavior === "before" ? [link, node] : [node, link];
        const wrapper = computed(options.group, element);
        const group = wrapper ? elementFromHast({ ...wrapper, children: [] }) : undefined;
        if (group) group.push(...pair);
        parent.splice(index, 1, ...(group ? [group] : pair));
      }
    }
  },
});

export interface ExternalLinksOptions {
  target?: Computed<string | false | null | undefined>;
  rel?: Computed<string | string[] | false | null | undefined>;
  protocols?: string[];
  content?: Computed<HastNode | HastNode[] | null | undefined>;
  contentProperties?: Computed<Properties | null | undefined>;
  properties?: Computed<Properties | null | undefined>;
  test?: Test;
}

/** rehype-external-links: `rel` (and optionally `target`) on links to absolute http(s) URLs. */
export const externalLinks = (options: ExternalLinksOptions = {}): ComarkPlugin => ({
  name: "remark-to-comark:external-links",
  post(state) {
    const protocols = options.protocols ?? ["http", "https"];
    visit(state.tree.nodes, 0, (node) => {
      const href = node[1].href;
      if (node[0] !== "a" || !isString(href)) return;
      const protocol = /^([a-z][a-z\d+.-]*):/i.exec(href)?.[1];
      const external = protocol ? protocols.includes(protocol) : href.startsWith("//");
      // Options may be functions of the hast element, as in the original, which sees the link with its children.
      const element = toHast(node);
      if (!external || !passes(options.test, element)) return;
      const value = <T>(option: Computed<T>): T => computed(option, element);
      // As in the original, any falsy `rel` means the default, and only an empty list means none.
      const relOption = value(options.rel) || ["nofollow"];
      const rel = Array.isArray(relOption) ? relOption : relOption.split(/\s+/).filter(Boolean);
      const target = value(options.target);
      const content = value(options.content);
      Object.assign(node[1], attributes(value(options.properties) ?? undefined));
      if (rel.length) node[1].rel = rel.join(" ");
      if (target) node[1].target = target;
      if (content) {
        const span: ElementNode = [
          "span",
          attributes(value(options.contentProperties) ?? undefined),
          ...fromHast(content),
        ];
        node.push(span);
      }
    });
  },
});

const isBlank = (node: Node) => !Array.isArray(node) && !node.trim();
// An image, or a link or button holding only images (at least one), as rehype-unwrap-images counts them.
const isImage = (node: Node): boolean => {
  if (!isElement(node)) return false;
  if (node[0] === "img") return true;
  if (node[0] !== "a" && node[0] !== "button") return false;
  const children = childrenOf(node);
  return children.some(isImage) && children.every((child) => isBlank(child) || isImage(child));
};

/** rehype-unwrap-images: a paragraph holding only images, or links around images, loses its `<p>`. */
export const unwrapImages = (): ComarkPlugin => ({
  name: "remark-to-comark:unwrap-images",
  post(state) {
    const unwrap = (nodes: Node[], start: number) => {
      for (let index = nodes.length - 1; index >= start; index--) {
        const node = nodes[index]!;
        if (!isElement(node)) continue;
        const children = childrenOf(node);
        if (
          node[0] === "p" &&
          children.some(isImage) &&
          children.every((child) => isBlank(child) || isImage(child))
        ) {
          // rehype keeps the line break between blocks, which reads as a space once two images sit side by side.
          nodes.splice(index, 1, "\n", ...children, "\n");
        } else unwrap(asList(node), 2);
      }
    };
    unwrap(state.tree.nodes, 0);
  },
});

/** remark-squeeze-paragraphs: paragraphs left empty by other plugins are removed. */
export const squeezeParagraphs = (): ComarkPlugin => ({
  name: "remark-to-comark:squeeze-paragraphs",
  post(state) {
    const squeeze = (nodes: Node[], start: number) => {
      for (let index = nodes.length - 1; index >= start; index--) {
        const node = nodes[index]!;
        if (!isElement(node)) continue;
        // Only Markdown paragraphs: an authored `<p> </p>` stays, as remark keeps raw HTML.
        if (node[0] === "p" && !fromHtml(node) && childrenOf(node).every(isBlank))
          nodes.splice(index, 1);
        else squeeze(asList(node), 2);
      }
    };
    squeeze(state.tree.nodes, 0);
  },
});

/** remark-reading-time: `meta.readingTime` from the reading-time package, as the original computes it. */
export const readingTime = (
  options: Parameters<typeof computeReadingTime>[1] = {},
): ComarkPlugin => ({
  name: "remark-to-comark:reading-time",
  post(state) {
    // remark-reading-time counts Markdown text and code blocks: not inline code, not raw HTML.
    const words = (node: Node, inPre: boolean): string => {
      if (!Array.isArray(node)) return node;
      if (!isElement(node) || fromHtml(node) || (node[0] === "code" && !inPre)) return "";
      return childrenOf(node)
        .map((child) => words(child, inPre || node[0] === "pre"))
        .join("");
    };
    state.tree.meta.readingTime = computeReadingTime(
      state.tree.nodes.map((node) => words(node, false)).join("\n"),
      options,
    );
  },
});

// npm-to-yarn ships CommonJS typed as an ES default export.
const convert: typeof convertCommand.default =
  Reflect.get(convertCommand, "default") ?? convertCommand;

const markdownParser = unified().use(remarkParse);

/**
 * Docusaurus' npm2yarn: a ```` ```bash npm2yarn ```` block becomes a `::code-group` with the command for each package
 * manager, which comark-tabs draws as tabs. Blocks are found with remark, so an example inside another code block
 * stays as written; inside a quote or list, every new line gets the block's prefix.
 */
export const npm2yarn = (
  options: { converters?: ("yarn" | "pnpm" | "bun")[] } = {},
): ComarkPlugin => ({
  name: "remark-to-comark:npm2yarn",
  pre(state) {
    if (!state.markdown.includes("npm2yarn")) return;
    const managers = options.converters ?? ["yarn", "pnpm"];
    const source = state.markdown;
    const edits: [number, number, string][] = [];
    visitMdast(
      markdownParser.parse(source),
      "code",
      (node: {
        lang?: string | null;
        meta?: string | null;
        value: string;
        position?: { start: { offset?: number }; end: { offset?: number } };
      }) => {
        if (
          !/(?:^|\s)npm2yarn(?:\s|$)/.test(node.meta ?? "") ||
          node.position?.start.offset == null ||
          node.position.end.offset == null
        )
          return;
        const start = node.position.start.offset;
        const lineStart = source.lastIndexOf("\n", start - 1) + 1;
        // The first line's text before the fence: indentation, `> `, or a list marker turned into spaces.
        const prefix = source
          .slice(lineStart, start)
          .replace(/[-*+]|\d+[.)]/g, (marker) => " ".repeat(marker.length));
        const fence = /^(`{3,}|~{3,})/.exec(source.slice(start))?.[1] ?? "```";
        const language = node.lang || "bash";
        const block = (label: string, body: string) => [
          `${fence}${language} [${label}]`,
          ...body.split("\n"),
          fence,
        ];
        const lines = [
          "::code-group",
          ...block("npm", node.value),
          ...managers.flatMap((manager) =>
            block(manager === "yarn" ? "Yarn" : manager, convert(node.value, manager)),
          ),
          "::",
        ];
        edits.push([
          start,
          node.position.end.offset,
          lines.map((line, index) => (index ? prefix + line : line)).join("\n"),
        ]);
      },
    );
    let markdown = source;
    for (const [start, end, text] of edits.reverse())
      markdown = markdown.slice(0, start) + text + markdown.slice(end);
    state.markdown = markdown;
  },
});
