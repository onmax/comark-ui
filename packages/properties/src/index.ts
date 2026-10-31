import type { ElementNode, Node } from "comark";
import { defineComarkPlugin } from "comark";
import { childrenOf, isElement } from "../../../shared/nodes.ts";

export interface PropertiesOptions {
  /** The frontmatter keys to show, in this order. Default `["status", "pr", "author", "date", "tags"]`. */
  keys?: string[];
  /** A label per key, such as `{ pr: "Pull request" }`. A key without one shows capitalized, and `pr` as "PR". */
  labels?: Record<string, string>;
  /** Puts the box at the top of a document that has no `::properties`. Default true. */
  top?: boolean;
}

export type PropertiesMeta = {
  /** One readable sentence per problem with the properties. Empty when there are none. Other plugins add theirs too. */
  issues: string[];
  /** The comark-linter rule of each issue, by its sentence, so the linter reports it under its own code. */
  issueRules: Record<string, string>;
};

type Issue = { rule: `comark/properties/${string}`; message: string };

const KEYS = ["status", "pr", "author", "date", "tags"];
const LABELS = new Map([
  ["pr", "PR"],
  ["url", "URL"],
]);
// GitHub's and GitLab's pull requests, merge requests, and issues, shown as `owner/repo#123`.
const REFERENCE =
  /^https:\/\/(?:www\.)?(?:github\.com|gitlab\.com)\/([\w.-]+\/[\w.-]+)\/(?:-\/)?(?:pull|issues|merge_requests)\/(\d+)\/?(?:[?#].*)?$/;

// Comments render nothing, so they aren't content the block would drop.
const isContent = (node: Node) => (Array.isArray(node) ? node[0] !== null : node.trim() !== "");
const labelOf = (key: string, labels: Record<string, string>) =>
  labels[key] ??
  LABELS.get(key) ??
  (key.charAt(0).toUpperCase() + key.slice(1)).replace(/[-_]+/g, " ");

function link(href: string) {
  const reference = REFERENCE.exec(href);
  const url = new URL(href);
  const text = reference
    ? `${reference[1]}#${reference[2]}`
    : `${url.host.replace(/^www\./, "")}${url.pathname === "/" ? "" : url.pathname}`;
  return ["a", { href: url.href }, text] satisfies ElementNode;
}

/** A frontmatter value as nodes: text, a link for an http(s) URL, or one tag per item of a list of those. */
function valueOf(value: unknown, nested = false): Node[] | undefined {
  if (Array.isArray(value)) {
    if (nested) return;
    const items = value.map((item) => valueOf(item, true));
    if (items.some((item) => item === undefined)) return;
    return items.map((item): Node => ["span", { class: "cfm-tag" }, ...(item ?? [])]);
  }
  if (value === undefined || value === null || value instanceof Object) return;
  // SAFETY: undefined, null, objects, and arrays returned above, so only a string, number, or boolean is left.
  const text = String(value as string | number | boolean);
  return /^https?:\/\/\S+$/.test(text) && URL.canParse(text) ? [link(text)] : [text];
}

/**
 * Shows chosen frontmatter keys, such as a review document's status, pull request, author, date, and tags, as a box of
 * properties where `::properties` sits, or at the top of the document. Problems are added to `meta.issues`.
 */
export default defineComarkPlugin<PropertiesOptions, PropertiesMeta>((options = {}) => ({
  name: "comark-properties",
  post(state) {
    const { tree } = state;
    const keys = options.keys ?? KEYS;
    const labels = options.labels ?? {};
    const issues: Issue[] = [];
    const rows: ElementNode[] = [];
    for (const key of keys) {
      const value: unknown = tree.frontmatter[key];
      if (
        value === undefined ||
        value === null ||
        value === "" ||
        (Array.isArray(value) && value.length === 0)
      )
        continue;
      const nodes = valueOf(value);
      if (!nodes) {
        issues.push({
          rule: "comark/properties/invalid-value",
          message: `properties: \`${key}\` in the frontmatter is neither text, a number, a link, nor a list of them, so it isn't shown. Write it as one of those.`,
        });
        continue;
      }
      rows.push([
        "div",
        { "data-key": key },
        ["dt", {}, labelOf(key, labels)],
        ["dd", {}, ...nodes],
      ]);
    }
    let placed = 0;
    const walk = (nodes: Node[], start: number) => {
      for (let index = start; index < nodes.length; index++) {
        const node = nodes[index];
        if (!node || !isElement(node)) continue;
        if (node[0] !== "properties") {
          // SAFETY: an element node is [tag, attributes, ...children], so its items from index 2 are nodes.
          walk(node as Node[], 2);
          continue;
        }
        const name = `\`::properties\` ${++placed}`;
        if (childrenOf(node).some(isContent))
          issues.push({
            rule: "comark/properties/content-dropped",
            message: `${name} drops the content inside it. Close the block with \`::\` on the line after it, and write text outside it.`,
          });
        for (const key of Object.keys(node[1])) {
          const prop = key.replace(/^:/, "");
          if (prop !== "id" && prop !== "class")
            issues.push({
              rule: "comark/properties/unknown-prop",
              message: `${name}: \`${prop}\` isn't a prop of \`::properties\`, so it's ignored. Choose the keys with the plugin's \`keys\` option.`,
            });
        }
        if (!rows.length)
          issues.push({
            rule: "comark/properties/nothing-to-show",
            message: `${name} has nothing to show: the frontmatter has none of ${keys.map((key) => `\`${key}\``).join(", ")}. Add one, or remove the block.`,
          });
        nodes[index] = ["properties", {}, ...rows];
      }
    };
    walk(tree.nodes, 0);
    if (!placed && rows.length && options.top !== false)
      tree.nodes.unshift(["properties", {}, ...rows]);
    tree.meta.issues = [...(tree.meta.issues ?? []), ...issues.map((issue) => issue.message)];
    tree.meta.issueRules = {
      ...tree.meta.issueRules,
      ...Object.fromEntries(issues.map((issue) => [issue.message, issue.rule])),
    };
  },
}));
