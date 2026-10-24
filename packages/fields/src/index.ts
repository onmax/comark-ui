import type { ElementNode, Node } from "comark";
import { defineComarkPlugin } from "comark";
import { resolveAttributes } from "comark/render";

export type FieldsMeta = {
  /** One readable sentence per problem with a `::field`. Empty when the document has none. Other plugins add theirs too. */
  issues: string[];
  /** The comark-linter rule of each issue, by its sentence, so the linter reports it under its own code. */
  issueRules: Record<string, string>;
};

type Issue = { rule: `comark/fields/${string}`; message: string };

/**
 * What a `::field` becomes: its `name`, `type`, `required` as `"true"`, and `default` as written, all strings. Its
 * description, and any `:::field` blocks for an object's properties, are its content.
 */
export type FieldAttributes = { name?: string; type?: string; required?: string; default?: string };

type Data = Parameters<typeof resolveAttributes>[1];

const isElement = (node: Node | undefined): node is ElementNode =>
  Array.isArray(node) && node[0] !== null;
// SAFETY: an element node is [tag, attributes, ...children], so everything after index 1 is a child node.
const childrenOf = (node: ElementNode) => node.slice(2) as Node[];
// A default may arrive parsed, as `:default="0"` or `:default='{"a":1}'`, so it's written back the way it reads.
const text = (value: unknown) =>
  value === undefined || value === null
    ? ""
    : value instanceof Object
      ? JSON.stringify(value)
      : // SAFETY: undefined, null, objects, and arrays returned above, so only a string, number, or boolean is left.
        String(value as string | number | boolean).trim();
// Comark writes a bare `required` as `:required="true"`, which resolves to `true`.
const isOn = (value: unknown) => value === true || value === "true" || value === "";

const PROPS = ["name", "type", "required", "default", "description"];

function field(node: ElementNode, number: number, data: Data, issues: Issue[]) {
  const attrs = resolveAttributes(node[1], data, { parseJson: true });
  const result: Record<string, string> = {};
  const name = text(attrs.name);
  const label = `\`::field\` ${number}${name ? ` (\`${name}\`)` : ""}`;
  if (name) result.name = name;
  else
    issues.push({
      rule: "comark/fields/missing-name",
      message: `\`::field\` ${number}${attrs.type ? ` (a ${text(attrs.type)})` : ""} has no \`name\`, so readers can't tell what it describes. Write \`::field{name="..."}\`.`,
    });
  for (const key of Object.keys(node[1])) {
    const prop = key.replace(/^:/, "");
    if (!PROPS.includes(prop) && prop !== "id" && prop !== "class")
      issues.push({
        rule: "comark/fields/unknown-prop",
        message: `${label}: \`${prop}\` isn't a prop of \`::field\`, so it's ignored. Use \`name\`, \`type\`, \`required\`, \`default\`, or \`description\`.`,
      });
  }
  const type = text(attrs.type);
  if (type) result.type = type;
  if (isOn(attrs.required)) result.required = "true";
  const fallback = text(attrs.default);
  if (fallback) result.default = fallback;
  const description = text(attrs.description);
  const children = childrenOf(node);
  const hasNestedFields = children.some((child) => isElement(child) && child[0] === "field");
  if (description && (!children.length || hasNestedFields))
    node.splice(2, 0, ["p", {}, description]);
  else if (description)
    issues.push({
      rule: "comark/fields/description-ignored",
      message: `${label} has content, so its \`description\` prop is ignored. Write the description as the field's first paragraph instead.`,
    });
  node[1] = result;
}

/**
 * Turns `::field-group` and `::field{name type required default}` into a list of props or options, with nested
 * `:::field` blocks for an object's properties. Problems, such as a field without a name, are added to `meta.issues`.
 */
export default defineComarkPlugin<void, FieldsMeta>(() => ({
  name: "comark-fields",
  post(state) {
    const { tree } = state;
    const data: Data = { frontmatter: tree.frontmatter, meta: tree.meta, data: {}, props: {} };
    const issues: Issue[] = [];
    let count = 0;
    const walk = (nodes: Node[]) => {
      for (const node of nodes) {
        if (!isElement(node)) continue;
        if (node[0] === "field") field(node, ++count, data, issues);
        else if (node[0] === "field-group") node[1] = {};
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
