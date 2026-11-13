import type { ElementNode, Node } from "comark";
import { defineComarkPlugin } from "comark";
import { resolveAttributes } from "comark/render";
import { draw } from "./draw.ts";
import { limit, readGraph, type Problem } from "./read.ts";
import { text } from "../../../shared/text.ts";
import { childrenOf, isElement } from "../../../shared/nodes.ts";

export type GitGraphMeta = {
  /** One readable sentence per problem with a git graph. Other plugins add theirs too. */
  issues: string[];
  /** The comark-linter rule of each issue, by its sentence, so the linter reports it under its own code. */
  issueRules: Record<string, string>;
};

/**
 * What a `::git-graph` or a ```` ```git-graph ```` fence becomes. `label` names the figure for screen readers. Its
 * children are plain elements: the header, a `git-graph-lines` node beside the rows, the legend, and the `#footer` slot.
 */
export type GitGraphAttributes = { label?: string };

/** The lines and dots beside the rows, drawn while parsing, so no renderer lays anything out. */
export type GitGraphLinesAttributes = { svg?: string; width?: number; height?: number };

type Rule = `comark/git-graph/${string}`;
type Issue = { rule: Rule; message: string };
type Data = Parameters<typeof resolveAttributes>[1];

const PROPS = ["title", "reverse", "max-count"];
const LOG = "`git log --graph --oneline --decorate --parents`";

const isContent = (node: Node) => (Array.isArray(node) ? node[0] !== null : node.trim() !== "");
const textOf = (node: Node): string =>
  !Array.isArray(node) ? node : isElement(node) ? childrenOf(node).map(textOf).join("") : "";
const isTemplate = (node: Node, name: string): node is ElementNode =>
  isElement(node) && node[0] === "template" && node[1].name === name;
// A paragraph Comark wraps around a slot's only line, which a title, drawn inline, can't hold.
const unwrap = (nodes: Node[]) =>
  nodes
    .filter(isContent)
    .flatMap((node) => (isElement(node) && node[0] === "p" ? childrenOf(node) : [node]));
const flag = (value: unknown) => value === true || value === "" || value === "true";

function problem(name: string, found: Problem, fence: boolean): Issue {
  switch (found.kind) {
    case "no-commits":
      return {
        rule: "comark/git-graph/missing-log",
        message: `${name} has no commits to draw. Paste the output of ${LOG} ${fence ? "in it" : "in a fence inside it"}.`,
      };
    case "no-parents":
      return {
        rule: "comark/git-graph/missing-parents",
        message: `${name}'s \`git log\` was run without \`--parents\`, so it shows the commits in one line and draws no merges. Run ${LOG} again and paste that.`,
      };
    case "unknown-branch":
      return {
        rule: "comark/git-graph/unknown-branch",
        message: `${name}: \`${found.command}\` names \`${found.branch}\`, a branch the \`git log\` above doesn't show. Add the branch to the \`git log\` command, or add \`--all\`.`,
      };
    case "unknown-commit":
      return {
        rule: "comark/git-graph/unknown-commit",
        message: `${name}: \`${found.command}\` names ${found.sha}, a commit the \`git log\` above doesn't show. Widen the \`git log\` so it includes that commit.`,
      };
  }
}

interface Figure {
  /** The block's name in its issues. */
  name: string;
  source: string;
  fence: boolean;
  title: Node[];
  footer: Node[];
  reverse: boolean;
  maxCount: unknown;
}

function figure(input: Figure, issues: Issue[]): ElementNode | undefined {
  const { name } = input;
  let graph = readGraph(input.source);
  for (const found of graph.problems) issues.push(problem(name, found, input.fence));
  if (!graph.commits.length) return undefined;

  const raw = input.maxCount;
  if (raw !== undefined) {
    const count = Number(raw);
    if (Number.isInteger(count) && count > 0) graph = limit(graph, count);
    else
      issues.push({
        rule: "comark/git-graph/invalid-max-count",
        message: `${name}: \`max-count\` is "${text(raw)}", so every commit shows. Write a whole number from 1, as with \`git log -n\`.`,
      });
  }
  const drawing = draw(graph, input.reverse);
  const { title, footer } = input;
  const label = title.map(textOf).join("").trim();
  return [
    "git-graph",
    label ? { label } : {},
    [
      "div",
      { class: "cgg-head" },
      ...(title.length ? [["span", { class: "cgg-title" }, ...title] as ElementNode] : []),
      ["span", { class: "cgg-count" }, drawing.summary],
    ],
    [
      "div",
      { class: "cgg-graph" },
      ["git-graph-lines", { svg: drawing.svg, width: drawing.width, height: drawing.height }],
      ["div", { class: "cgg-rows" }, ...drawing.rows],
    ],
    ...(drawing.legend.length
      ? [["div", { class: "cgg-legend" }, ...drawing.legend] as ElementNode]
      : []),
    ...(footer.length ? [["div", { class: "cgg-footer" }, ...footer] as ElementNode] : []),
  ];
}

function block(node: ElementNode, number: number, data: Data, issues: Issue[]): ElementNode {
  const attrs = resolveAttributes(node[1], data, { parseJson: true });
  const name = `\`::git-graph\` ${number}`;
  for (const key of Object.keys(node[1])) {
    const prop = key.replace(/^:/, "");
    if (!PROPS.includes(prop) && prop !== "id" && prop !== "class")
      issues.push({
        rule: "comark/git-graph/unknown-prop",
        message: `${name}: \`${prop}\` isn't a prop of \`::git-graph\`, so it's ignored. Use \`title\`, \`reverse\`, or \`max-count\`.`,
      });
  }
  const children = childrenOf(node);
  const titleSlot = children.find((child) => isTemplate(child, "title"));
  const footerSlot = children.find((child) => isTemplate(child, "footer"));
  const content = children
    .flatMap((child) =>
      child === titleSlot || child === footerSlot
        ? []
        : isTemplate(child, "default")
          ? childrenOf(child)
          : [child],
    )
    .filter(isContent);
  const fences = content.filter(
    (child): child is ElementNode => isElement(child) && child[0] === "pre",
  );
  if (content.length > fences.length)
    issues.push({
      rule: "comark/git-graph/content-dropped",
      message: `${name} drops the text beside its fence. Put only git's output in the fence, and write the rest outside the block or in a \`#footer\` slot.`,
    });
  const drawn = figure(
    {
      name,
      source: fences.map(textOf).join("\n"),
      fence: false,
      title: titleSlot
        ? unwrap(childrenOf(titleSlot))
        : text(attrs.title)
          ? [text(attrs.title)]
          : [],
      footer: footerSlot ? childrenOf(footerSlot).filter(isContent) : [],
      reverse: flag(attrs.reverse),
      maxCount: attrs["max-count"],
    },
    issues,
  );
  return drawn ?? ["div", {}];
}

// A fence's `[label]` is the one attribute Comark keeps on it, so the fence form has a title and no other props.
// One with no commits stays a code block, which still shows what was pasted.
function fence(node: ElementNode, number: number, issues: Issue[]): ElementNode {
  const title = text(node[1].filename);
  return (
    figure(
      {
        name: `The \`\`\`git-graph fence ${number}`,
        source: textOf(node),
        fence: true,
        title: title ? [title] : [],
        footer: [],
        reverse: false,
        maxCount: undefined,
      },
      issues,
    ) ?? node
  );
}

/**
 * Turns pasted git output, in a ```` ```git-graph ```` fence or a `::git-graph` around a fence, into a commit graph:
 * `git log --graph --oneline --decorate --parents` for the commits, branches, merges, and tags, then `git cherry -v`
 * and a `git cherry-pick` dry run for which branches have each change, numbered in the order they were picked.
 * Problems are added to `meta.issues`.
 */
export default defineComarkPlugin<void, GitGraphMeta>(() => ({
  name: "comark-git-graph",
  post(state) {
    const { tree } = state;
    const data: Data = { frontmatter: tree.frontmatter, meta: tree.meta, data: {}, props: {} };
    const issues: Issue[] = [];
    let blocks = 0;
    let fences = 0;
    const walk = (nodes: Node[], start: number, parent?: string) => {
      for (let index = start; index < nodes.length; index++) {
        const node = nodes[index];
        if (!node || !isElement(node)) continue;
        if (node[0] === "git-graph") {
          nodes[index] = block(node, ++blocks, data, issues);
          continue;
        }
        // Diff reads its direct source fences at render time, after this hook.
        if (
          node[0] === "pre" &&
          parent !== "diff" &&
          !node[1].$?.html &&
          text(node[1].language).toLowerCase() === "git-graph"
        ) {
          nodes[index] = fence(node, ++fences, issues);
          continue;
        }
        // SAFETY: an element node is [tag, attributes, ...children], so its children start at index 2.
        walk(node as Node[], 2, node[0]);
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
