import type { ElementNode, Node } from "comark";
import { defineComarkPlugin } from "comark";
import { textContent } from "comark/utils";
import { type GitHubMeta, type Issue, report } from "./meta.ts";

export type CalloutType = "note" | "tip" | "important" | "warning" | "caution";

export interface CalloutsOptions {
  /** Titles for callouts that don't set their own, by type. Default GitHub's: Note, Tip, Important, Warning, Caution. */
  titles?: Partial<Record<CalloutType, string>>;
}

/** The node a callout becomes. Its attributes are `type` and `title`; its children are the callout's blocks. */
export const CALLOUT_TAG = "github-callout";

const TITLES: Record<CalloutType, string> = {
  note: "Note",
  tip: "Tip",
  important: "Important",
  warning: "Warning",
  caution: "Caution",
};
const isType = (value: string): value is CalloutType => Object.hasOwn(TITLES, value);
// Comark text nodes are strings, elements are arrays, and comments are arrays with a null tag.
const isElement = (node: Node | undefined): node is ElementNode =>
  Array.isArray(node) && node[0] !== null;
const childrenOf = ([, , ...rest]: ElementNode): Node[] => rest;

/**
 * Reads the `[!TYPE]` marker at the start of a blockquote's first line, written as text or, with the components
 * plugin, as `["span", {}, "!TYPE"]`. Returns the type as written and the inline nodes after the marker, or nothing.
 */
function readMarker([first, ...after]: Node[]): { type: string; rest: Node[] } | undefined {
  if (first === undefined) return;
  if (!Array.isArray(first)) {
    const match = /^\s*\[!(\w+)\]/.exec(first);
    const type = match?.[1];
    if (!match || !type) return;
    const tail = first.slice(match[0].length);
    return { type, rest: tail ? [tail, ...after] : after };
  }
  if (!isElement(first) || first[0] !== "span") return;
  const [label, ...more] = childrenOf(first);
  if (label === undefined || Array.isArray(label) || more.length) return;
  const type = /^!(\w+)$/.exec(label)?.[1];
  if (type) return { type, rest: after };
}

/** Splits inline nodes at the first line break: the marker's line is the title, the rest the first paragraph. */
function splitLine(nodes: Node[]): { line: Node[]; rest: Node[] } {
  const line: Node[] = [];
  for (const [index, node] of nodes.entries()) {
    const split = splitInlineNode(node);
    if (!split) {
      line.push(node);
      continue;
    }
    if (split.line) line.push(split.line);
    return { line, rest: [...(split.rest ? [split.rest] : []), ...nodes.slice(index + 1)] };
  }
  return { line, rest: [] };
}

/** Splits one inline node while retaining its element wrappers on both sides of the break. */
function splitInlineNode(node: Node): { line?: Node; rest?: Node } | undefined {
  if (!Array.isArray(node)) {
    const at = node.indexOf("\n");
    if (at === -1) return;
    return {
      line: at > 0 ? node.slice(0, at) : undefined,
      rest: at < node.length - 1 ? node.slice(at + 1) : undefined,
    };
  }
  if (!isElement(node)) return;
  const children = childrenOf(node);
  for (const [index, child] of children.entries()) {
    const split = splitInlineNode(child);
    if (!split) continue;
    const before = children.slice(0, index);
    const after = children.slice(index + 1);
    const lineChildren = [...before, ...(split.line ? [split.line] : [])];
    const restChildren = [...(split.rest ? [split.rest] : []), ...after];
    return {
      line: lineChildren.length ? [node[0], node[1], ...lineChildren] : undefined,
      rest: restChildren.length ? [node[0], node[1], ...restChildren] : undefined,
    };
  }
}

function toCallout(
  node: ElementNode,
  titles: Record<CalloutType, string>,
  issues: Issue[],
): ElementNode | undefined {
  const children = childrenOf(node);
  // Comark unwraps a blockquote of one paragraph, so its children are that paragraph's inline content.
  const [head] = children;
  const wrapped = isElement(head) && head[0] === "p";
  const found = readMarker(wrapped ? childrenOf(head) : children);
  if (!found) return;
  const type = found.type.toLowerCase();
  if (!isType(type)) {
    issues.push({
      rule: "comark/github/unknown-callout-type",
      message: `The quote marked "[!${found.type}]" isn't a GitHub callout, so it renders as a plain quote with the marker as text. Use \`[!NOTE]\`, \`[!TIP]\`, \`[!IMPORTANT]\`, \`[!WARNING]\`, or \`[!CAUTION]\`.`,
    });
    return;
  }
  const marker = { type, rest: found.rest };

  const { line, rest } = splitLine(marker.rest);
  const title = textContent(["span", {}, ...line]).trim() || titles[marker.type];
  const paragraph: ElementNode = ["p", {}, ...rest];
  const text = rest.some((child) => Array.isArray(child) || child.trim());
  return [
    CALLOUT_TAG,
    { type: marker.type, title },
    ...(text ? [paragraph] : []),
    ...(wrapped ? children.slice(1) : []),
  ];
}

function transform(
  nodes: Node[],
  start: number,
  titles: Record<CalloutType, string>,
  issues: Issue[],
) {
  for (let index = start; index < nodes.length; index++) {
    const node = nodes[index];
    if (!isElement(node)) continue;
    const callout = node[0] === "blockquote" ? toCallout(node, titles, issues) : undefined;
    if (callout) nodes[index] = callout;
    // SAFETY: an element node is [tag, attributes, ...children], so its children start at index 2.
    transform((callout ?? node) as Node[], 2, titles, issues);
  }
}

/**
 * GitHub's alerts, `> [!NOTE]` through `> [!CAUTION]`, as callouts with an icon and a title. Text after the marker
 * on its line replaces the title. It is named `alert`, so it takes the place of Comark's built-in alert plugin. A
 * marker of any other type, such as `[!INFO]`, leaves a plain quote and is reported in `meta.issues`.
 */
export const callouts = /* @__PURE__ */ defineComarkPlugin<CalloutsOptions, GitHubMeta>(
  (options) => ({
    name: "alert",
    post(state) {
      const issues: Issue[] = [];
      transform(state.tree.nodes, 0, { ...TITLES, ...options?.titles }, issues);
      if (issues.length) report(state.tree.meta, issues);
    },
  }),
);
