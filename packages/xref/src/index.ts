import type { ElementNode, Node } from "comark";
import { defineComarkPlugin } from "comark";
import { resolveAttributes } from "comark/render";
import { textContent } from "comark/utils";

export interface XrefOptions {
  /** What a figure's number reads as. Default `"Figure"`. */
  figure?: string;
  /** What a table's number reads as. Default `"Table"`. */
  table?: string;
}

export type XrefMeta = {
  /** One readable sentence per problem with a cross-reference. Empty when there are none. Other plugins add theirs too. */
  issues: string[];
  /** The comark-linter rule of each issue, by its sentence, so the linter reports it under its own code. */
  issueRules: Record<string, string>;
};

type Issue = { rule: `comark/xref/${string}`; message: string };
type Data = Parameters<typeof resolveAttributes>[1];
type Kind = "fig" | "tbl";

const LABEL = /^(fig|tbl)-[\w-]+$/;
const isElement = (node: Node): node is ElementNode => Array.isArray(node) && node[0] !== null;
const childrenOf = ([, , ...rest]: ElementNode): Node[] => rest;
const isContent = (node: Node) => (Array.isArray(node) ? node[0] !== null : node.trim() !== "");
const text = (value: unknown) =>
  value === undefined || value === null || value instanceof Object
    ? ""
    : // SAFETY: undefined, null, objects, and arrays returned above, so only a string, number, or boolean is left.
      String(value as string | number | boolean).trim();
const kindOf = (id: string): Kind | undefined =>
  LABEL.test(id) ? (id.startsWith("fig-") ? "fig" : "tbl") : undefined;

/**
 * Numbers images and figures with an `fig-` id and tables with a `tbl-` id in document order, captions them "Figure 1"
 * and "Table 1", and turns `:ref{#fig-login}` into a link that reads "Figure 1". Problems are added to `meta.issues`.
 */
export default defineComarkPlugin<XrefOptions, XrefMeta>((options = {}) => ({
  name: "comark-xref",
  post(state) {
    const { tree } = state;
    const words: Record<Kind, string> = {
      fig: options.figure ?? "Figure",
      tbl: options.table ?? "Table",
    };
    const data: Data = { frontmatter: tree.frontmatter, meta: tree.meta, data: {}, props: {} };
    const issues: Issue[] = [];
    const numbers = new Map<string, string>();
    const counts: Record<Kind, number> = { fig: 0, tbl: 0 };
    const label = (id: string, kind: Kind) => {
      if (numbers.has(id)) {
        issues.push({
          rule: "comark/xref/duplicate-label",
          message: `xref: \`#${id}\` labels more than one ${kind === "fig" ? "figure" : "table"}. Give each its own id.`,
        });
        return numbers.get(id)!;
      }
      const name = `${words[kind]} ${++counts[kind]}`;
      numbers.set(id, name);
      return name;
    };
    const caption = (name: string, rest: string): Node[] => [
      ["span", { class: "cxr-label" }, rest ? `${name}:` : name],
      ...(rest ? [` ${rest}`] : []),
    ];

    // Numbers first, in document order, so a reference may come before what it points at.
    const number = (nodes: Node[], start: number) => {
      for (let index = start; index < nodes.length; index++) {
        const node = nodes[index];
        if (!node || !isElement(node)) continue;
        const [tag, attrs] = node;
        const id = text(attrs.id);
        const kind = kindOf(id);
        // An image alone in its paragraph becomes a figure with its alt text as the caption.
        if (tag === "p" && childrenOf(node).filter(isContent).length === 1) {
          const [image] = childrenOf(node).filter(isContent);
          if (
            image &&
            isElement(image) &&
            image[0] === "img" &&
            kindOf(text(image[1].id)) === "fig"
          ) {
            const { id: imageId, ...rest } = image[1];
            const name = label(text(imageId), "fig");
            nodes[index] = [
              "figure",
              { id: text(imageId), class: "cxr" },
              ["img", rest],
              ["figcaption", {}, ...caption(name, text(rest.alt))],
            ];
            continue;
          }
        }
        if (kind === "tbl" && tag === "table") {
          const { caption: title, ...rest } = attrs;
          const name = label(id, "tbl");
          node[1] = { ...rest, class: [text(rest.class), "cxr"].filter(Boolean).join(" ") };
          node.splice(2, 0, ["caption", {}, ...caption(name, text(title))]);
          continue;
        }
        if (kind === "fig" && tag === "img")
          issues.push({
            rule: "comark/xref/inline-figure",
            message: `xref: the image \`#${id}\` shares its paragraph with text, so it isn't numbered. Put it on a line of its own.`,
          });
        // A `:ref` carries the id it points at, so it must not label a figure of its own.
        else if (kind === "fig" && tag !== "ref") label(id, "fig");
        // SAFETY: an element node is [tag, attributes, ...children], so its items from index 2 are nodes.
        number(node as Node[], 2);
      }
    };
    number(tree.nodes, 0);

    let refs = 0;
    const link = (nodes: Node[], start: number) => {
      for (let index = start; index < nodes.length; index++) {
        const node = nodes[index];
        if (!node || !isElement(node)) continue;
        if (node[0] !== "ref") {
          // SAFETY: an element node is [tag, attributes, ...children], so its items from index 2 are nodes.
          link(node as Node[], 2);
          continue;
        }
        const attrs = resolveAttributes(node[1], data, { parseJson: true });
        const id = text(attrs.id);
        const name = `\`:ref\` ${++refs}`;
        const found = numbers.get(id);
        if (!id)
          issues.push({
            rule: "comark/xref/missing-id",
            message: `${name} names nothing. Write the id it points at, such as \`:ref{#fig-login}\`.`,
          });
        else if (!found)
          issues.push({
            rule: "comark/xref/unknown-label",
            message: `${name}: nothing is labeled \`#${id}\`. Add \`{#${id}}\` to an image or a \`::table\`, or fix the id; labels start with \`fig-\` or \`tbl-\`.`,
          });
        const dropped = textContent(["span", {}, ...childrenOf(node)]).trim();
        if (dropped)
          issues.push({
            rule: "comark/xref/ref-content",
            message: `${name} drops its text "${dropped}", since a reference reads as its label's number. Remove the brackets: \`:ref{#${id || "fig-login"}}\`.`,
          });
        nodes[index] = found
          ? ["a", { href: `#${id}`, class: "cxr-ref" }, found]
          : `[${id || "?"}]`;
      }
    };
    link(tree.nodes, 0);
    tree.meta.issues = [...(tree.meta.issues ?? []), ...issues.map((issue) => issue.message)];
    tree.meta.issueRules = {
      ...tree.meta.issueRules,
      ...Object.fromEntries(issues.map((issue) => [issue.message, issue.rule])),
    };
  },
}));
