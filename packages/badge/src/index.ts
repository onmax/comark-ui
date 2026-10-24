import type { ElementNode, Node } from "comark";
import { defineComarkPlugin } from "comark";
import { resolveAttributes } from "comark/render";
import { textContent } from "comark/utils";

export type BadgeMeta = {
  /** One readable sentence per problem with a `:badge`. Empty when the document has none. Other plugins add theirs too. */
  issues: string[];
  /** The comark-linter rule of each issue, by its sentence, so the linter reports it under its own code. */
  issueRules: Record<string, string>;
};

type Issue = { rule: `comark/badge/${string}`; message: string };

/** Nuxt UI's colors. */
export const colors = [
  "primary",
  "secondary",
  "success",
  "info",
  "warning",
  "error",
  "neutral",
] as const;

export type BadgeColor = (typeof colors)[number];

/** What a `:badge` or `::badge` becomes: its color, `primary` unless it sets a known one, around its content. */
export type BadgeAttributes = { color?: BadgeColor };

type Data = Parameters<typeof resolveAttributes>[1];

const isElement = (node: Node | undefined): node is ElementNode =>
  Array.isArray(node) && node[0] !== null;
// Comments render nothing, so they aren't content a badge would show.
const isContent = (node: Node) => (Array.isArray(node) ? node[0] !== null : node.trim() !== "");
// SAFETY: an element node is [tag, attributes, ...children], so everything after index 1 is a child node.
const childrenOf = (node: ElementNode) => node.slice(2) as Node[];
const text = (value: unknown) =>
  value === undefined || value === null || value instanceof Object
    ? ""
    : // SAFETY: undefined, null, objects, and arrays returned above, so only a string, number, or boolean is left.
      String(value as string | number | boolean).trim();
const clip = (value: string) => {
  const words = value.trim().replace(/\s+/g, " ");
  return words.length > 40 ? `${words.slice(0, 39)}…` : words;
};
const isColor = (value: string): value is BadgeColor => colors.some((color) => color === value);

function badge(node: ElementNode, number: number, data: Data, issues: Issue[]) {
  // A block badge's content is a paragraph, which a badge, drawn inline, can't hold.
  const content = childrenOf(node)
    .filter(isContent)
    .flatMap((child) => (isElement(child) && child[0] === "p" ? childrenOf(child) : [child]));
  const words = clip(textContent(["span", {}, ...content]));
  const name = `\`:badge\` ${number}${words ? ` ("${words}")` : ""}`;
  for (const key of Object.keys(node[1])) {
    const prop = key.replace(/^:/, "");
    if (prop !== "color" && prop !== "id" && prop !== "class")
      issues.push({
        rule: "comark/badge/unknown-prop",
        message: `${name}: \`${prop}\` isn't a prop of \`:badge\`, so it's ignored. Use \`color\`.`,
      });
  }
  const written = text(resolveAttributes(node[1], data, { parseJson: true }).color);
  let color: BadgeColor = "primary";
  if (isColor(written)) color = written;
  else if (written)
    issues.push({
      rule: "comark/badge/invalid-color",
      message: `${name}: \`color\` is "${clip(written)}", so it shows as primary. Write one of ${colors.join(", ")}.`,
    });
  if (!content.length)
    issues.push({
      rule: "comark/badge/empty-badge",
      message: `${name} is empty. Write its text in brackets: \`:badge[New]\`.`,
    });
  node.splice(1, node.length - 1, { color }, ...content);
}

/**
 * Turns inline `:badge[New]{color="success"}` and Nuxt UI's block `::badge` into badges in one of Nuxt UI's colors.
 * Problems, such as an unknown color, are added to `meta.issues`.
 */
export default defineComarkPlugin<void, BadgeMeta>(() => ({
  name: "comark-badge",
  post(state) {
    const { tree } = state;
    const data: Data = { frontmatter: tree.frontmatter, meta: tree.meta, data: {}, props: {} };
    const issues: Issue[] = [];
    let count = 0;
    const walk = (nodes: Node[]) => {
      for (const node of nodes) {
        if (!isElement(node)) continue;
        if (node[0] === "badge") badge(node, ++count, data, issues);
        walk(childrenOf(node));
      }
    };
    walk(tree.nodes);
    tree.meta.issues = [...(tree.meta.issues ?? []), ...issues.map((issue) => issue.message)];
    tree.meta.issueRules = {
      ...tree.meta.issueRules,
      ...Object.fromEntries(issues.map((issue) => [issue.message, issue.rule])),
    };
  },
}));
