import type { ElementNode, Node } from "comark";
import { defineComarkPlugin } from "comark";
import { resolveAttributes } from "comark/render";
import { textContent } from "comark/utils";

export type OutlineMeta = {
  /** One readable sentence per problem with a `::toc`. Empty when the document has none. Other plugins add theirs too. */
  issues: string[];
  /** The comark-linter rule of each issue, by its sentence, so the linter reports it under its own code. */
  issueRules: Record<string, string>;
};

type Issue = { rule: `comark/outline/${string}`; message: string };

/** What a `::toc` becomes, and all its renderers read. Its children are the nested list of links. */
export type TocAttributes = { title?: string; empty?: boolean };

/** What the side outline becomes, and all its renderers read. Its children are the nested list of links. */
export type RailAttributes = { title: string };

export interface RailOptions {
  /** The title above the links, which also names the `nav` for screen readers. Default "On this page". */
  title?: string;
  /** The deepest heading it lists, from 2 to 6. Default `3`, so h2 and h3. */
  depth?: 2 | 3 | 4 | 5 | 6;
}

export interface OutlineOptions {
  /**
   * Adds a side outline at the end of every document with at least two headings to list: an "On this page" column
   * beside the text that marks the section being read. `true` lists h2 and h3. Default `false`.
   */
  rail?: RailOptions | boolean;
}

/** The node of the side outline. The plugin adds one at the end of a document when `rail` is on. */
export const RAIL_TAG = "toc-rail";

type Data = Parameters<typeof resolveAttributes>[1];
interface Heading {
  level: number;
  id: string;
  text: string;
}

const HEADING = /^h([1-6])$/;
const PROPS = ["depth", "title"];
const isElement = (node: Node): node is ElementNode => Array.isArray(node) && node[0] !== null;
const childrenOf = ([, , ...rest]: ElementNode): Node[] => rest;
// Comments render nothing, so they aren't content a toc would drop.
const isContent = (node: Node) => (Array.isArray(node) ? node[0] !== null : node.trim() !== "");
const text = (value: unknown) =>
  value === undefined || value === null || value instanceof Object
    ? ""
    : // SAFETY: undefined, null, objects, and arrays returned above, so only a string, number, or boolean is left.
      String(value as string | number | boolean).trim();

/** Every heading with an id, in document order. */
function headingsOf(nodes: Node[], found: Heading[] = []) {
  for (const node of nodes) {
    if (!isElement(node)) continue;
    const [tag, attrs] = node;
    const level = HEADING.exec(tag)?.[1];
    const id = text(attrs.id);
    if (level && id) found.push({ level: Number(level), id, text: textContent(node).trim() });
    else if (tag !== "toc" && tag !== RAIL_TAG) headingsOf(childrenOf(node), found);
  }
  return found;
}

/** The headings as nested lists, each under the closest heading above it of a higher level. */
function list(headings: Heading[]): ElementNode {
  const top: ElementNode = ["div", {}];
  const stack: { level: number; item: ElementNode; list?: ElementNode }[] = [
    { level: 0, item: top },
  ];
  for (const heading of headings) {
    while (stack.at(-1)!.level >= heading.level) stack.pop();
    const parent = stack.at(-1)!;
    if (!parent.list) parent.item.push((parent.list = ["ul", {}]));
    const item: ElementNode = ["li", {}, ["a", { href: `#${heading.id}` }, heading.text]];
    parent.list.push(item);
    stack.push({ level: heading.level, item });
  }
  return stack[0]!.list ?? ["ul", {}];
}

function toc(
  node: ElementNode,
  number: number,
  data: Data,
  headings: Heading[],
  issues: Issue[],
): ElementNode {
  const name = `\`::toc\` ${number}`;
  const attrs = resolveAttributes(node[1], data, { parseJson: true });
  if (childrenOf(node).some(isContent))
    issues.push({
      rule: "comark/outline/content-dropped",
      message: `${name} drops the content inside it. Close the block with \`::\` on the line after it, and write text outside it.`,
    });
  for (const key of Object.keys(node[1])) {
    const prop = key.replace(/^:/, "");
    if (!PROPS.includes(prop) && prop !== "id" && prop !== "class")
      issues.push({
        rule: "comark/outline/unknown-prop",
        message: `${name}: \`${prop}\` isn't a prop of \`::toc\`, so it's ignored. Use \`depth\` or \`title\`.`,
      });
  }
  const raw = text(attrs.depth);
  const depth = raw ? Number(raw) : 3;
  if (!Number.isInteger(depth) || depth < 2 || depth > 6) {
    issues.push({
      rule: "comark/outline/invalid-depth",
      message: `${name}: \`depth\` must be a whole number from 2 to 6, such as \`depth=3\` for h2 and h3 headings.`,
    });
    return ["toc", { empty: true }];
  }
  const listed = headings.filter((heading) => heading.level >= 2 && heading.level <= depth);
  if (!listed.length) {
    issues.push({
      rule: "comark/outline/no-headings",
      message: `${name} has no headings from h2 to h${depth} to list. Add \`##\` headings, or remove the block.`,
    });
    return ["toc", { empty: true }];
  }
  const title = text(attrs.title);
  return ["toc", title ? { title } : {}, list(listed)];
}

/** The side outline's node, or none when fewer than two headings would be listed. */
function rail(options: RailOptions, headings: Heading[]): ElementNode | undefined {
  const depth = options.depth && [2, 3, 4, 5, 6].includes(options.depth) ? options.depth : 3;
  const listed = headings.filter((heading) => heading.level >= 2 && heading.level <= depth);
  if (listed.length < 2) return undefined;
  return [RAIL_TAG, { title: options.title?.trim() || "On this page" }, list(listed)];
}

/**
 * Turns `::toc` into a nested list of links to the document's h2 and h3 headings, or down to `depth`. It reads the
 * headings itself, so it doesn't depend on running after Comark's toc plugin. Problems are added to `meta.issues`.
 * With `rail`, it also adds a side outline at the end of the document.
 */
export default defineComarkPlugin<OutlineOptions, OutlineMeta>((options = {}) => ({
  name: "comark-outline",
  post(state) {
    const { tree } = state;
    const data: Data = { frontmatter: tree.frontmatter, meta: tree.meta, data: {}, props: {} };
    const headings = headingsOf(tree.nodes);
    const issues: Issue[] = [];
    let count = 0;
    const walk = (nodes: Node[], start: number) => {
      for (let index = start; index < nodes.length; index++) {
        const node = nodes[index];
        if (!node || !isElement(node)) continue;
        if (node[0] === "toc") nodes[index] = toc(node, ++count, data, headings, issues);
        else {
          // SAFETY: an element node is [tag, attributes, ...children], so its items from index 2 are nodes.
          walk(node as Node[], 2);
        }
      }
    };
    walk(tree.nodes, 0);
    if (options.rail) {
      // A second pass over the same tree, such as a second instance of the plugin, keeps one outline.
      const old = tree.nodes.findIndex((node) => isElement(node) && node[0] === RAIL_TAG);
      if (old !== -1) tree.nodes.splice(old, 1);
      const node = rail(options.rail === true ? {} : options.rail, headings);
      if (node) tree.nodes.push(node);
    }
    tree.meta.issues = [...(tree.meta.issues ?? []), ...issues.map((issue) => issue.message)];
    tree.meta.issueRules = {
      ...tree.meta.issueRules,
      ...Object.fromEntries(issues.map((issue) => [issue.message, issue.rule])),
    };
  },
}));
