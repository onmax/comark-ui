import type { ElementNode, Node } from "comark";
import { defineComarkPlugin } from "comark";
import { resolveAttributes } from "comark/render";
import { textContent } from "comark/utils";

export type StepsMeta = {
  /** One readable sentence per problem with a `::steps`. Empty when the document has none. Other plugins add theirs too. */
  issues: string[];
  /** The comark-linter rule of each issue, by its sentence, so the linter reports it under its own code. */
  issueRules: Record<string, string>;
};

type Issue = { rule: `comark/steps/${string}`; message: string };

/** What a `::steps` becomes: an ordered list whose `start` is set only when its list starts past 1. */
export type StepsAttributes = { start?: string };

/** What each `step` inside it carries: its number, counted from `start`, for a renderer of your own. */
export type StepAttributes = { index?: string };

type Data = Parameters<typeof resolveAttributes>[1];

const isElement = (node: Node | undefined): node is ElementNode =>
  Array.isArray(node) && node[0] !== null;
// Comments render nothing, so they aren't content a step would hold.
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
const KINDS = new Map([
  ["p", "paragraph"],
  ["pre", "code block"],
  ["img", "image"],
  ["blockquote", "quote"],
  ["ul", "list"],
  ["ol", "list"],
  ["table", "table"],
]);

function describe(node: Node) {
  if (!Array.isArray(node)) return `the text "${clip(node)}"`;
  if (!isElement(node)) return "a comment";
  const tag = node[0];
  const kind = KINDS.get(tag) ?? (/^h[1-6]$/.test(tag) ? "heading" : `\`::${tag}\` block`);
  const words = clip(textContent(node));
  return `the ${kind}${words ? ` "${words}"` : ""}`;
}

interface Walk {
  data: Data;
  issues: Issue[];
  count: number;
}

// The nodes that take the block's place: any content the steps can't hold, then the steps, if there are any.
function steps(node: ElementNode, name: string, walk: Walk): Node[] {
  const attrs = resolveAttributes(node[1], walk.data, { parseJson: true });
  for (const key of Object.keys(node[1])) {
    const prop = key.replace(/^:/, "");
    if (prop !== "level" && prop !== "id" && prop !== "class")
      walk.issues.push({
        rule: "comark/steps/unknown-prop",
        message: `${name}: \`${prop}\` isn't a prop of \`::steps\`, so it's ignored. Use \`level\`, the level of the headings that start each step.`,
      });
  }
  const levelText = text(attrs.level) || "3";
  const level = /^[2-6]$/.test(levelText) ? Number(levelText) : 3;
  if (String(level) !== levelText)
    walk.issues.push({
      rule: "comark/steps/invalid-level",
      message: `${name}: \`level\` must be 2 to 6, the level of the headings that start each step. Write \`level="3"\` for \`###\` headings.`,
    });
  const marker = "#".repeat(level);
  const content = childrenOf(node).filter(isContent);
  const startsStep = (child: Node) => isElement(child) && child[0] === `h${level}`;
  const first = content.findIndex(startsStep);
  const items: ElementNode[] = [];
  let start = 1;
  let before: Node[] = [];
  const [list] = content;
  if (first >= 0) {
    before = content.slice(0, first);
    if (before[0] !== undefined)
      walk.issues.push({
        rule: "comark/steps/content-before-steps",
        message: `${name}: ${describe(before[0])} comes before the first \`${marker}\` heading, so it renders above the steps. Move it under a heading, or out of the block.`,
      });
    for (const child of content.slice(first)) {
      if (startsStep(child)) items.push(["step", {}, child]);
      else items.at(-1)?.push(child);
    }
  } else if (content.length === 1 && isElement(list) && list[0] === "ol") {
    const written = Number(text(list[1].start));
    if (Number.isSafeInteger(written) && written > 0) start = written;
    for (const item of childrenOf(list))
      if (isElement(item) && item[0] === "li") items.push(["step", {}, ...childrenOf(item)]);
  } else {
    before = content;
    const others = [2, 3, 4, 5, 6].find((other) =>
      content.some((child) => isElement(child) && child[0] === `h${other}`),
    );
    walk.issues.push({
      rule: "comark/steps/no-steps",
      message:
        `${name} has no \`${marker}\` headings, so it renders as plain content. ` +
        (others
          ? `Its headings are \`${"#".repeat(others)}\`, so write \`::steps{level="${others}"}\`.`
          : `Start each step with a \`${marker} \` heading, or put one numbered list inside.`),
    });
  }
  for (const [at, item] of items.entries()) item[1] = { index: String(start + at) };
  if (!items.length) return before;
  node[1] = start > 1 ? { start: String(start) } : {};
  node.splice(2, node.length - 2, ...items);
  return [...before, node];
}

// Inner blocks first, so a `::steps` inside a step keeps its own headings.
function transform(nodes: Node[], walk: Walk): Node[] {
  return nodes.flatMap((node) => {
    if (!isElement(node)) return [node];
    const name = node[0] === "steps" ? `\`::steps\` ${++walk.count}` : "";
    node.splice(2, node.length - 2, ...transform(childrenOf(node), walk));
    return name ? steps(node, name, walk) : [node];
  });
}

/**
 * Turns `::steps` into numbered steps: each heading at `level` (3 by default) starts a step that holds everything up to
 * the next one, and a numbered list inside instead makes one step of each item. Problems are added to `meta.issues`.
 */
export default defineComarkPlugin<void, StepsMeta>(() => ({
  name: "comark-steps",
  post(state) {
    const { tree } = state;
    const walk: Walk = {
      data: { frontmatter: tree.frontmatter, meta: tree.meta, data: {}, props: {} },
      issues: [],
      count: 0,
    };
    tree.nodes = transform(tree.nodes, walk);
    tree.meta.issues = [...(tree.meta.issues ?? []), ...walk.issues.map((issue) => issue.message)];
    tree.meta.issueRules = {
      ...tree.meta.issueRules,
      ...Object.fromEntries(walk.issues.map((issue) => [issue.message, issue.rule])),
    };
  },
}));
