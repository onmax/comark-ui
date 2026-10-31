import type { ElementNode, Node } from "comark";
import { defineComarkPlugin } from "comark";
import { resolveAttributes } from "comark/render";
import { textContent } from "comark/utils";
import { hash, text } from "../../../shared/text.ts";
import { childrenOf, isElement } from "../../../shared/nodes.ts";

export type MagicMoveMeta = {
  /** One readable sentence per problem with a `::magic-move`. Empty when there are none. */
  issues: string[];
  /** The comark-linter rule of each issue, by its sentence, so the linter reports it under its own code. */
  issueRules: Record<string, string>;
};

type Issue = { rule: `comark/magic-move/${string}`; message: string };

type Data = Parameters<typeof resolveAttributes>[1];

// Comments are arrays with a null tag and render nothing, so they aren't steps either.
const isContent = (node: Node) => (Array.isArray(node) ? node[0] !== null : node.trim() !== "");
const isCode = (node: Node): node is ElementNode => isElement(node) && node[0] === "pre";
const clip = (value: string) => {
  const words = value.trim().replace(/\s+/g, " ");
  return words.length > 40 ? `${words.slice(0, 39)}…` : words;
};
const KINDS = new Map([
  ["p", "paragraph"],
  ["img", "image"],
  ["blockquote", "quote"],
  ["ul", "list"],
  ["ol", "list"],
  ["table", "table"],
]);

function describe(node: Node) {
  if (!Array.isArray(node)) return `the text "${clip(node)}"`;
  if (!isElement(node)) return "a comment";
  const [tag, attrs] = node;
  const kind = KINDS.get(tag) ?? (/^h[1-6]$/.test(tag) ? "heading" : `\`::${tag}\` block`);
  const words = clip(tag === "img" ? text(attrs.alt) : textContent(node));
  return `the ${kind}${words ? ` "${words}"` : ""}`;
}

const PROPS = ["title", "id", "class"];

interface Walk {
  data: Data;
  issues: Issue[];
  blocks: number;
  prefix: string;
}

function magicMove(node: ElementNode, walk: Walk) {
  const title = text(resolveAttributes(node[1], walk.data, { parseJson: true }).title);
  const name = `magic-move ${++walk.blocks}${title ? ` ("${title}")` : ""}`;
  for (const prop of Object.keys(node[1]).map((key) => key.replace(/^:/, "")))
    if (!PROPS.includes(prop))
      walk.issues.push({
        rule: "comark/magic-move/unknown-prop",
        message: `${name}: \`${prop}\` isn't a prop of ::magic-move, so it's ignored. Use \`title\`.`,
      });
  const steps: ElementNode[] = [];
  for (const child of childrenOf(node).filter(isContent)) {
    if (isCode(child)) steps.push(child);
    else
      walk.issues.push({
        rule: "comark/magic-move/content-in-magic-move",
        message: `${name} drops ${describe(child)}: only code blocks go inside, one per step. Move it out of the block.`,
      });
  }
  if (steps.length < 2)
    walk.issues.push({
      rule: "comark/magic-move/single-step",
      message: `${name} has ${steps.length ? "one code block" : "no code blocks"}, so there's nothing to move between; add a code block for each step, or use a plain code block.`,
    });
  const labels: string[] = [];
  const uid = `${walk.prefix}-${walk.blocks}`;
  const items = steps.map((pre, index): ElementNode => {
    // The fence's `[label]` names the step's tab, not a file, so it leaves the code block.
    const { filename, ...attrs } = pre[1];
    const label = text(filename) || `Step ${index + 1}`;
    labels.push(label);
    return [
      "magic-move-step",
      { uid, index: String(index + 1), label },
      ["pre", attrs, ...childrenOf(pre)],
    ];
  });
  node[1].uid = uid;
  node[1].labels = labels;
  node.splice(2, node.length - 2, ...items);
}

// Every renderer gets explicit steps with their position, so none of them has to split rendered children.
function normalize(nodes: Node[], walk: Walk) {
  for (const node of nodes) {
    if (!isElement(node)) continue;
    if (node[0] === "magic-move") magicMove(node, walk);
    else normalize(childrenOf(node), walk);
  }
}

/**
 * Turns the code blocks in `::magic-move` into steps, each with the tab its label names. Without a script they read one
 * after another; the script shows one at a time and moves the tokens they share into place when a tab opens another. Problems, such as a block with one
 * step, are added to `meta.issues`.
 */
export default defineComarkPlugin<void, MagicMoveMeta>(() => ({
  name: "comark-magic-move",
  post(state) {
    const { tree } = state;
    const walk: Walk = {
      data: { frontmatter: tree.frontmatter, meta: tree.meta, data: {}, props: {} },
      issues: [],
      blocks: 0,
      prefix: `cmv-${hash(state.markdown)}`,
    };
    normalize(tree.nodes, walk);
    tree.meta.issues = [...(tree.meta.issues ?? []), ...walk.issues.map((issue) => issue.message)];
    tree.meta.issueRules = {
      ...tree.meta.issueRules,
      ...Object.fromEntries(walk.issues.map((issue) => [issue.message, issue.rule])),
    };
  },
}));
