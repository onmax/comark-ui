import type { ElementNode, Node } from "comark";
import { defineComarkPlugin } from "comark";
import { resolveAttributes } from "comark/render";
import { textContent } from "comark/utils";

export type SourcesMeta = {
  /** One readable sentence per problem with a citation or `::sources`. Empty when there are none. Other plugins add theirs too. */
  issues: string[];
  /** The comark-linter rule of each issue, by its sentence, so the linter reports it under its own code. */
  issueRules: Record<string, string>;
};

type Issue = { rule: `comark/sources/${string}`; message: string };

/** What a `::sources` becomes, and all its renderers read. Its children are the numbered list. */
export type SourcesAttributes = { title?: string };

interface Source {
  number: number;
  item: ElementNode;
  title: string;
  /** The ids of the markers that cite it, for its back-links. */
  cited: string[];
}

const isElement = (node: Node): node is ElementNode => Array.isArray(node) && node[0] !== null;
const childrenOf = ([, , ...rest]: ElementNode): Node[] => rest;
const isContent = (node: Node) => (Array.isArray(node) ? node[0] !== null : node.trim() !== "");
const sourceId = (number: number) => `cso-${number}`;
const text = (value: unknown) =>
  value === undefined || value === null || value instanceof Object
    ? ""
    : // SAFETY: undefined, null, objects, and arrays returned above, so only a string, number, or boolean is left.
      String(value as string | number | boolean).trim();

/** The source numbers in a marker, such as `2` or `1, 3`, or undefined when it holds anything else. */
function numbersOf(marker: ElementNode) {
  const value = textContent(marker).trim();
  if (!/^\d+(?:\s*,\s*\d+)*$/.test(value)) return;
  return value.split(",").map(Number);
}

/**
 * Turns `:cite[2]` into a numbered link to the second item of the document's `::sources` list, and that list into the
 * sources, each with a link back to where it's cited. Problems are added to `meta.issues`.
 */
export default defineComarkPlugin<void, SourcesMeta>(() => ({
  name: "comark-sources",
  post(state) {
    const { tree } = state;
    const issues: Issue[] = [];
    const sources = new Map<number, Source>();
    const data: Parameters<typeof resolveAttributes>[1] = {
      frontmatter: tree.frontmatter,
      meta: tree.meta,
      data: {},
      props: {},
    };
    let title = "";
    let lists = 0;
    const read = (nodes: Node[], start: number) => {
      for (let index = start; index < nodes.length; index++) {
        const node = nodes[index];
        if (!node || !isElement(node)) continue;
        if (node[0] !== "sources") {
          // SAFETY: an element node is [tag, attributes, ...children], so its items from index 2 are nodes.
          read(node as Node[], 2);
          continue;
        }
        const name = `\`::sources\` ${++lists}`;
        for (const key of Object.keys(node[1])) {
          const prop = key.replace(/^:/, "");
          if (prop !== "title" && prop !== "id" && prop !== "class")
            issues.push({
              rule: "comark/sources/unknown-prop",
              message: `${name}: \`${prop}\` isn't a prop of \`::sources\`, so it's ignored. Use \`title\`.`,
            });
        }
        const content = childrenOf(node).filter(isContent);
        const list = content.find(
          (child): child is ElementNode => isElement(child) && child[0] === "ol",
        );
        if (lists > 1)
          issues.push({
            rule: "comark/sources/second-list",
            message: `${name}: a document has one list of sources, and this is a second. Merge it into the first.`,
          });
        else if (!list)
          issues.push({
            rule: "comark/sources/missing-list",
            message: `${name} needs a numbered list of links, such as \`1. [Vite](https://vite.dev)\`.`,
          });
        else {
          title = text(resolveAttributes(node[1], data, { parseJson: true }).title);
          if (content.length > 1)
            issues.push({
              rule: "comark/sources/content-dropped",
              message: `${name} drops everything but its list. Move the rest outside the block.`,
            });
          for (const [position, item] of childrenOf(list).filter(isElement).entries()) {
            const number = position + 1;
            if (!JSON.stringify(item).includes('"href"'))
              issues.push({
                rule: "comark/sources/missing-link",
                message: `${name}: source ${number} has no link. Write it as \`[Title](https://...)\`.`,
              });
            sources.set(number, { number, item, title: textContent(item).trim(), cited: [] });
          }
        }
        nodes[index] = ["sources", {}];
      }
    };
    read(tree.nodes, 0);

    let markers = 0;
    const cite = (nodes: Node[], start: number) => {
      for (let index = start; index < nodes.length; index++) {
        const node = nodes[index];
        if (!node || !isElement(node)) continue;
        if (node[0] !== "cite") {
          // SAFETY: an element node is [tag, attributes, ...children], so its items from index 2 are nodes.
          cite(node as Node[], 2);
          continue;
        }
        const name = `\`:cite\` ${++markers}`;
        const numbers = numbersOf(node);
        if (!numbers) {
          issues.push({
            rule: "comark/sources/invalid-cite",
            message: `${name} needs source numbers inside it, such as \`:cite[2]\` or \`:cite[1,3]\`.`,
          });
          nodes[index] = "";
          continue;
        }
        const links: Node[] = [];
        for (const number of numbers) {
          const source = sources.get(number);
          if (links.length) links.push(", ");
          if (!source) {
            issues.push({
              rule: "comark/sources/unknown-source",
              message: sources.size
                ? `${name} cites source ${number}, but \`::sources\` lists ${sources.size}. Fix the number, or add the source.`
                : `${name} cites source ${number}, but the document has no \`::sources\` list. Add one with the links it cites.`,
            });
            links.push(String(number));
            continue;
          }
          const id = `${sourceId(number)}-cite-${source.cited.length + 1}`;
          source.cited.push(id);
          links.push([
            "a",
            { href: `#${sourceId(number)}`, id, title: source.title },
            String(number),
          ]);
        }
        nodes[index] = ["sup", { class: "cso-cite" }, "[", ...links, "]"];
        // A marker sits against the word it follows, though `:cite` needs a space before it to be read.
        const before = nodes[index - 1];
        if (index > 2 && before !== undefined && !Array.isArray(before))
          nodes[index - 1] = before.trimEnd();
      }
    };
    cite(tree.nodes, 0);

    const items: ElementNode[] = [...sources.values()].map(({ number, item, cited }) => [
      "li",
      { id: sourceId(number) },
      ...childrenOf(item),
      ...cited.flatMap((id, n): Node[] => [
        " ",
        [
          "a",
          { href: `#${id}`, class: "cso-back", "aria-label": `Back to citation ${n + 1}` },
          cited.length > 1 ? `↩${n + 1}` : "↩",
        ],
      ]),
    ]);
    const fill = (nodes: Node[], start: number) => {
      for (let index = start; index < nodes.length; index++) {
        const node = nodes[index];
        if (!node || !isElement(node)) continue;
        if (node[0] === "sources" && !childrenOf(node).length) {
          nodes[index] = items.length
            ? ["sources", title ? { title } : {}, ["ol", {}, ...items]]
            : ["sources", {}];
          return true;
        }
        // SAFETY: an element node is [tag, attributes, ...children], so its items from index 2 are nodes.
        if (fill(node as Node[], 2)) return true;
      }
      return false;
    };
    fill(tree.nodes, 0);
    tree.meta.issues = [...(tree.meta.issues ?? []), ...issues.map((issue) => issue.message)];
    tree.meta.issueRules = {
      ...tree.meta.issueRules,
      ...Object.fromEntries(issues.map((issue) => [issue.message, issue.rule])),
    };
  },
}));
