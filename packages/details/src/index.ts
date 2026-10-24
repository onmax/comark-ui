import type { ElementNode, Node } from "comark";
import { defineComarkPlugin } from "comark";
import { resolveAttributes } from "comark/render";
import { textContent } from "comark/utils";
import {
  createIcons,
  describeIconProblem,
  iconProblemRule,
  type IconData,
  type Icons,
} from "comark-icon";

export type DetailsOptions = {
  /**
   * Resolves the `icon` of accordion items and collapsibles, from `createIcons()` in comark-icon. Pass the one the
   * page's other plugins use, so they share its `collections` and `fetch`. By default icons come from the Iconify API.
   */
  iconResolver?: Icons;
};

export type DetailsMeta = {
  /** One readable sentence per problem with a `::details`, `::accordion`, or `::collapsible`. Empty when there are none. */
  issues: string[];
  /** The comark-linter rule of each issue, by its sentence, so the linter reports it under its own code. */
  issueRules: Record<string, string>;
};

type Issue = { rule: `comark/details/${string}` | `comark/icon/${string}`; message: string };

/**
 * What `::details`, each `:::accordion-item`, and `::collapsible` become: a `disclosure` node, drawn as `<details>`,
 * whose first child is a `disclosure-summary`. Accordion items of one `type="single"` accordion share a `name`.
 */
export type DisclosureAttributes = {
  variant?: "details" | "item" | "collapsible";
  open?: string;
  name?: string;
};

/** The summary's own attributes; its label is its content. A collapsible's `show` and `hide` come before it. */
export type DisclosureSummaryAttributes = { icon?: IconData; show?: string; hide?: string };

type Data = Parameters<typeof resolveAttributes>[1];

const isElement = (node: Node | undefined): node is ElementNode =>
  Array.isArray(node) && node[0] !== null;
// Comments render nothing, so they aren't content a block would drop.
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
// Comark writes a bare `open` as `:open="true"`, which resolves to `true`.
const isOn = (value: unknown) => value === true || value === "true" || value === "";
const isTemplate = (node: Node, name: string): node is ElementNode =>
  isElement(node) && node[0] === "template" && node[1].name === name;

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
  const [tag] = node;
  const kind = KINDS.get(tag) ?? (/^h[1-6]$/.test(tag) ? "heading" : `\`::${tag}\` block`);
  const words = clip(textContent(node));
  return `the ${kind}${words ? ` "${words}"` : ""}`;
}

// FNV-1a of the source. Names from it differ between documents on one page, so one accordion never closes another's
// items, yet stay the same every time a document renders.
function hash(source: string) {
  let value = 0x811c9dc5;
  for (let at = 0; at < source.length; at++)
    value = Math.imul(value ^ source.charCodeAt(at), 0x01000193);
  return (value >>> 0).toString(36);
}

interface Walk {
  data: Data;
  issues: Issue[];
  icons: { summary: ElementNode; value: string; name: string }[];
  counts: Record<string, number>;
  prefix: string;
}

const resolve = (node: ElementNode, walk: Walk) =>
  resolveAttributes(node[1], walk.data, { parseJson: true });
const nameOf = (tag: string, walk: Walk) =>
  `\`::${tag}\` ${(walk.counts[tag] = (walk.counts[tag] ?? 0) + 1)}`;

const PROPS = {
  details: ["summary", "open", "icon"],
  accordion: ["type", "defaultValue"],
  "accordion-item": ["label", "icon", "description"],
  collapsible: ["name", "openText", "closeText", "icon"],
};
const or = (words: string[]) => {
  const quoted = words.map((word) => `\`${word}\``);
  return quoted.length > 2
    ? `${quoted.slice(0, -1).join(", ")}, or ${quoted.at(-1)}`
    : quoted.join(" or ");
};

// A misspelled `summary` or `label` is dropped without a trace, so each prop that isn't one is named.
function unknownProps(node: ElementNode, block: keyof typeof PROPS, name: string, walk: Walk) {
  const props = PROPS[block];
  for (const key of Object.keys(node[1])) {
    const prop = key.replace(/^:/, "");
    if (!props.includes(prop) && prop !== "id" && prop !== "class")
      walk.issues.push({
        rule: "comark/details/unknown-prop",
        message: `${name}: \`${prop}\` isn't a prop of \`${block === "accordion-item" ? ":::" : "::"}${block}\`, so it's ignored. Use ${or(props)}.`,
      });
  }
}

function summary(label: Node[], icon: string, name: string, walk: Walk, extra = {}): ElementNode {
  const node: ElementNode = ["disclosure-summary", { ...extra }, ...label];
  if (icon) walk.icons.push({ summary: node, value: icon, name });
  return node;
}

function details(node: ElementNode, walk: Walk) {
  const name = nameOf("details", walk);
  unknownProps(node, "details", name, walk);
  const attrs = resolve(node, walk);
  const children = childrenOf(node);
  const slot = children.find((child) => isTemplate(child, "summary"));
  // A `#default` slot holds the body as Comark wrote it; anything else outside a slot is the body too.
  const body = children.flatMap((child) =>
    child === slot ? [] : isTemplate(child, "default") ? childrenOf(child) : [child],
  );
  let label: Node[] = slot ? childrenOf(slot) : [];
  if (!label.some(isContent)) label = text(attrs.summary) ? [text(attrs.summary)] : [];
  if (!label.length) {
    walk.issues.push({
      rule: "comark/details/missing-summary",
      message: `${name} has no summary, so it shows "Details". Write \`::details{summary="..."}\`, or a \`#summary\` slot.`,
    });
    label = ["Details"];
  }
  node[0] = "disclosure";
  node[1] = isOn(attrs.open) ? { variant: "details", open: "true" } : { variant: "details" };
  node.splice(2, node.length - 2, summary(label, text(attrs.icon), name, walk), ...body);
}

function collapsible(node: ElementNode, walk: Walk) {
  const name = nameOf("collapsible", walk);
  unknownProps(node, "collapsible", name, walk);
  const attrs = resolve(node, walk);
  if (!childrenOf(node).some(isContent))
    walk.issues.push({
      rule: "comark/details/empty-collapsible",
      message: `${name} is empty. Put the content it hides inside it, or remove it.`,
    });
  const head = summary([text(attrs.name) || "properties"], text(attrs.icon), name, walk, {
    show: text(attrs.openText) || "Show",
    hide: text(attrs.closeText) || "Hide",
  });
  node[0] = "disclosure";
  node[1] = { variant: "collapsible" };
  node.splice(2, 0, head);
}

// Nuxt UI opens items by their position, as strings counted from 0: `:defaultValue='["0"]'` or `defaultValue="1"`.
function opened(value: unknown, count: number, name: string, walk: Walk) {
  const values = (Array.isArray(value) ? value : value === undefined ? [] : [value]).map(text);
  const open = new Set<number>();
  for (const written of values) {
    const at = Number(written);
    if (written && Number.isInteger(at) && at >= 0 && at < count) open.add(at);
    else
      walk.issues.push({
        rule: "comark/details/invalid-default-value",
        message: `${name}: \`defaultValue\` "${clip(written)}" isn't an item. Write each item's position from 0, such as \`:defaultValue='["0"]'\`.`,
      });
  }
  return open;
}

function accordion(node: ElementNode, walk: Walk) {
  const name = nameOf("accordion", walk);
  unknownProps(node, "accordion", name, walk);
  const attrs = resolve(node, walk);
  const type = text(attrs.type) || "multiple";
  if (type !== "single" && type !== "multiple")
    walk.issues.push({
      rule: "comark/details/invalid-type",
      message: `${name}: \`type\` is "${clip(type)}". Write \`type="single"\` to keep one item open, or leave it out.`,
    });
  const items: ElementNode[] = [];
  for (const child of childrenOf(node).filter(isContent)) {
    if (isElement(child) && child[0] === "accordion-item") items.push(child);
    else
      walk.issues.push({
        rule: "comark/details/content-outside-item",
        message: `${name}: put each item in \`:::accordion-item{label="..."}\`. Found ${describe(child)} outside an item, so it doesn't render.`,
      });
  }
  if (!items.length)
    walk.issues.push({
      rule: "comark/details/empty-accordion",
      message: `${name} has no items. Put \`:::accordion-item{label="..."}\` blocks inside it, or remove it.`,
    });
  const open = opened(attrs.defaultValue, items.length, name, walk);
  const shared = type === "single" ? `${walk.prefix}-${walk.counts.accordion}` : "";
  for (const [index, item] of items.entries()) {
    unknownProps(item, "accordion-item", `${name}, item ${index + 1}`, walk);
    const props = resolve(item, walk);
    let label = text(props.label);
    if (!label) {
      label = `Item ${index + 1}`;
      walk.issues.push({
        rule: "comark/details/missing-label",
        message: `${name}, item ${index + 1}: \`label\` is required. Write \`:::accordion-item{label="..."}\`.`,
      });
    }
    const description = text(props.description);
    const body = childrenOf(item).some(isContent)
      ? childrenOf(item)
      : description
        ? [description]
        : [];
    const attributes: Record<string, string> = {};
    attributes.variant = "item";
    if (shared) attributes.name = shared;
    // Only the first stays open where the browser keeps one, so the page doesn't change as it loads.
    if (open.has(index) && !(shared && [...open][0] !== index)) attributes.open = "true";
    item[0] = "disclosure";
    item[1] = attributes;
    item.splice(
      2,
      item.length - 2,
      summary([label], text(props.icon), `${name}, item ${index + 1}`, walk),
      ...body,
    );
  }
  node[1] = {};
  node.splice(2, node.length - 2, ...items);
}

function stray(node: ElementNode, walk: Walk) {
  const label = text(resolve(node, walk).label);
  walk.issues.push({
    rule: "comark/details/stray-accordion-item",
    message: `\`:::accordion-item\` ${(walk.counts.stray = (walk.counts.stray ?? 0) + 1)}${label ? ` ("${clip(label)}")` : ""} sits outside \`::accordion\`, so it renders on its own. Wrap it in \`::accordion\`.`,
  });
  const body = childrenOf(node);
  node[0] = "disclosure";
  node[1] = { variant: "details" };
  node.splice(2, node.length - 2, summary([label || "Details"], "", "", walk), ...body);
}

function transform(nodes: Node[], walk: Walk, inAccordion = false) {
  for (const node of nodes) {
    if (!isElement(node)) continue;
    const [tag, attrs] = node;
    // Raw HTML subtrees are opaque; preserve their contents and any nested Comark-like markup.
    if (attrs.$?.html) continue;
    if (tag === "details") details(node, walk);
    else if (tag === "collapsible") collapsible(node, walk);
    else if (tag === "accordion") accordion(node, walk);
    else if (tag === "accordion-item" && !inAccordion) stray(node, walk);
    transform(childrenOf(node), walk, tag === "accordion");
  }
}

async function addIcons(walk: Walk, resolver: Icons) {
  if (!walk.icons.length) return;
  const resolved = await resolver.resolve(walk.icons.map(({ value }) => value));
  for (const { summary: node, value, name } of walk.icons) {
    const icon = resolved.get(value);
    if (!icon) continue;
    if ("problem" in icon)
      walk.issues.push({
        rule: iconProblemRule(icon),
        message: `${name}, icon "${clip(value)}": ${describeIconProblem(value, icon)}`,
      });
    else node[1].icon = icon;
  }
}

/**
 * Turns `::details`, `::accordion` with `:::accordion-item` blocks, and `::collapsible` into native `<details>` with a
 * real `<summary>`, so they open and close with no script. Problems are added to `meta.issues`.
 */
export default defineComarkPlugin<DetailsOptions, DetailsMeta>((options = {}) => {
  const resolver = options.iconResolver ?? createIcons();
  return {
    name: "comark-details",
    async post(state) {
      const { tree } = state;
      const walk: Walk = {
        data: { frontmatter: tree.frontmatter, meta: tree.meta, data: {}, props: {} },
        issues: [],
        icons: [],
        counts: {},
        prefix: `cdt-${hash(state.markdown)}`,
      };
      transform(tree.nodes, walk);
      await addIcons(walk, resolver);
      tree.meta.issues = [
        ...(tree.meta.issues ?? []),
        ...walk.issues.map((issue) => issue.message),
      ];
      tree.meta.issueRules = {
        ...tree.meta.issueRules,
        ...Object.fromEntries(walk.issues.map((issue) => [issue.message, issue.rule])),
      };
    },
  };
});
