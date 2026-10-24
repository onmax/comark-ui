import type { ElementNode, Node } from "comark";
import { defineComarkPlugin } from "comark";
import { resolveAttributes } from "comark/render";
import { encode } from "uqr";

export type QrMeta = {
  /** One readable sentence per problem with a `:qr`. Empty when the document has none. Other plugins add theirs too. */
  issues: string[];
  /** The comark-linter rule of each issue, by its sentence, so the linter reports it under its own code. */
  issueRules: Record<string, string>;
};

type Issue = { rule: `comark/qr/${string}`; message: string };

/**
 * What a `:qr` becomes, and all its renderers read: the encoded `value`, the code's `size` in modules, and `path`, its
 * dark modules as one SVG path. A `:qr` it can't encode has no attributes and renders nothing.
 */
export type QrAttributes = { value?: string; size?: number; path?: string };

type Data = Parameters<typeof resolveAttributes>[1];

const isElement = (node: Node): node is ElementNode => Array.isArray(node) && node[0] !== null;
const text = (value: unknown) =>
  value === undefined || value === null || value instanceof Object
    ? ""
    : // SAFETY: undefined, null, objects, and arrays returned above, so only a string, number, or boolean is left.
      String(value as string | number | boolean).trim();
// Comments render nothing, so they aren't content a `:qr` would drop.
const isContent = (node: Node) => (Array.isArray(node) ? node[0] !== null : node.trim() !== "");
const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Each row's runs of dark modules as one rectangle, so a code is one short path. */
function pathOf(data: boolean[][]) {
  let path = "";
  for (const [y, row] of data.entries())
    for (let x = 0; x < row.length; x++) {
      if (!row[x]) continue;
      const start = x;
      while (row[x + 1]) x++;
      path += `M${start} ${y}h${x - start + 1}v1H${start}z`;
    }
  return path;
}

function qr(node: ElementNode, number: number, data: Data, issues: Issue[]): QrAttributes {
  const name = `\`:qr\` ${number}`;
  const [, , ...children] = node;
  if (children.some(isContent))
    issues.push({
      rule: "comark/qr/content-dropped",
      message: `${name} drops the text in its brackets. Put the link in \`value\`, and write any text outside the \`:qr\`.`,
    });
  for (const key of Object.keys(node[1])) {
    const prop = key.replace(/^:/, "");
    if (prop !== "value" && prop !== "id" && prop !== "class")
      issues.push({
        rule: "comark/qr/unknown-prop",
        message: `${name}: \`${prop}\` isn't a prop of \`:qr\`, so it's ignored. Use \`value\`.`,
      });
  }
  const value = text(resolveAttributes(node[1], data, { parseJson: true }).value);
  if (!value) {
    issues.push({
      rule: "comark/qr/missing-value",
      message: `${name} needs a \`value\` to encode, such as \`:qr{value="https://example.com"}\`.`,
    });
    return {};
  }
  try {
    // Anthony Fu's QR Toolkit defaults: phones read a two-module quiet zone as well as the four the standard asks for.
    const code = encode(value, { border: 2, ecc: "M" });
    return { value, size: code.size, path: pathOf(code.data) };
  } catch (error) {
    issues.push({
      rule: "comark/qr/value-too-long",
      message: `${name} can't encode its \`value\` (${errorText(error)}). Shorten it.`,
    });
    return {};
  }
}

/**
 * Turns `:qr{value="https://..."}` into a QR code drawn as an inline SVG while parsing, for opening a preview link on a
 * phone. Problems are added to `meta.issues`.
 */
export default defineComarkPlugin<void, QrMeta>(() => ({
  name: "comark-qr",
  post(state) {
    const { tree } = state;
    const data: Data = { frontmatter: tree.frontmatter, meta: tree.meta, data: {}, props: {} };
    const issues: Issue[] = [];
    let count = 0;
    const walk = (nodes: Node[], start: number) => {
      for (let index = start; index < nodes.length; index++) {
        const node = nodes[index];
        if (!node || !isElement(node)) continue;
        // Only the computed attributes, so no renderer encodes anything.
        if (node[0] === "qr") nodes[index] = ["qr", qr(node, ++count, data, issues)];
        else {
          // SAFETY: an element node is [tag, attributes, ...children], so its items from index 2 are nodes.
          walk(node as Node[], 2);
        }
      }
    };
    walk(tree.nodes, 0);
    tree.meta.issues = [...(tree.meta.issues ?? []), ...issues.map((issue) => issue.message)];
    tree.meta.issueRules = {
      ...tree.meta.issueRules,
      ...Object.fromEntries(issues.map((issue) => [issue.message, issue.rule])),
    };
  },
}));
