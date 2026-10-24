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
import { defaultManagers, hasCommand, translate, type PackageManager } from "./npm2yarn.ts";

export type { PackageManager };

export type TabsOptions = {
  /**
   * Icons for tabs that don't set one, by label, such as `{ pnpm: "logos:pnpm" }`. Labels match without regard to
   * case. Each value is an Iconify name or an image URL, like the `icon` prop.
   */
  icons?: Record<string, string>;
  /**
   * Resolves the icons, from `createIcons()` in comark-icon. Pass the one the page's other plugins use, so they share
   * its `collections` and `fetch`. By default icons come from the Iconify API.
   */
  iconResolver?: Icons;
  /**
   * The tabs an `npm2yarn` code block becomes, in order. Defaults to npm, pnpm, yarn, and bun; add `"deno"` for Deno.
   */
  managers?: PackageManager[];
};

export type TabsMeta = {
  /** One readable sentence per problem with a `::tabs`, `::code-group`, or `:::tabs-item`. Empty when there are none. */
  issues: string[];
  /** The comark-linter rule of each issue, by its sentence, so the linter reports it under its own code. */
  issueRules: Record<string, string>;
};

type Issue = { rule: `comark/tabs/${string}` | `comark/icon/${string}`; message: string };

type Data = Parameters<typeof resolveAttributes>[1];

const isElement = (node: Node | undefined): node is ElementNode =>
  Array.isArray(node) && node[0] !== null;
// Comments are arrays with a null tag and render nothing, so they aren't tabs either.
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
  const [tag, attrs] = node;
  const kind =
    KINDS.get(tag) ??
    (/^h[1-6]$/.test(tag) ? "heading" : `\`${tag === "tabs-item" ? ":::" : "::"}${tag}\` block`);
  const words = clip(tag === "img" ? text(attrs.alt) : textContent(node));
  return `the ${kind}${words ? ` "${words}"` : ""}`;
}

interface Walk {
  data: Data;
  issues: Issue[];
  labelIcons: Map<string, string>;
  icons: { block: ElementNode; index: number; value: string; name: string }[];
  tabs: number;
  groups: number;
  strays: number;
  blocks: number;
  npm2yarn: number;
  managers: PackageManager[];
  prefix: string;
}

// FNV-1a of the source. Ids from it differ between documents on one page, and from the ids authors write, yet stay
// the same every time a document renders.
function hash(text: string) {
  let value = 0x811c9dc5;
  for (let at = 0; at < text.length; at++)
    value = Math.imul(value ^ text.charCodeAt(at), 0x01000193);
  return (value >>> 0).toString(36);
}

// `icon=logos:pnpm` after a code block's label, quoted or not.
const ICON = /(?:^|\s)icon=(?:"([^"]*)"|'([^']*)'|(\S+))(?=\s|$)/;
const NPM2YARN = /(?:^|\s)npm2yarn(?=\s|$)/;
const or = new Intl.ListFormat("en", { type: "disjunction" });

const resolve = (node: ElementNode, walk: Walk) =>
  resolveAttributes(node[1], walk.data, { parseJson: true });

// A code group is `::tabs` with a code block in each tab, so every renderer handles one shape.
function codeGroup(node: ElementNode, name: string, walk: Walk) {
  const items: ElementNode[] = [];
  for (const child of childrenOf(node).filter(isContent)) {
    if (!isElement(child) || child[0] !== "pre") {
      walk.issues.push({
        rule: "comark/tabs/content-in-code-group",
        message: `${name}: only code blocks go inside. Move ${describe(child)} out, or use \`::tabs\`.`,
      });
      continue;
    }
    let label = text(child[1].filename);
    if (!label) {
      label = text(child[1].language) || `Code ${items.length + 1}`;
      walk.issues.push({
        rule: "comark/tabs/missing-label",
        message: `${name}, block ${items.length + 1}: a code block needs a label. Put it in brackets after the language: \`\`\`bash [npm].`,
      });
    }
    // The tab names the block, so its own title bar doesn't repeat it.
    delete child[1].filename;
    // A block in a code group is one tab already, so `npm2yarn` doesn't split it again.
    const meta = text(child[1].meta).replace(NPM2YARN, " ");
    const icon = ICON.exec(meta);
    const rest = (icon ? meta.replace(icon[0], " ") : meta).trim();
    if (rest) child[1].meta = rest;
    else delete child[1].meta;
    items.push([
      "tabs-item",
      icon ? { label, icon: icon[1] ?? icon[2] ?? icon[3] } : { label },
      child,
    ]);
  }
  node[0] = "tabs";
  node[1].code = "true";
  node.splice(2, node.length - 2, ...items);
}

// A misspelled `sync` or `icon` is dropped without a trace, so each prop that isn't one is named.
function unknownProps(node: ElementNode, name: string, block: string, walk: Walk) {
  const props = block === ":::tabs-item" ? ["label", "icon"] : ["sync"];
  const list = props.map((prop) => `\`${prop}\``).join(" or ");
  for (const key of Object.keys(node[1])) {
    const prop = key.replace(/^:/, "");
    if (!props.includes(prop) && prop !== "id" && prop !== "class")
      walk.issues.push({
        rule: "comark/tabs/unknown-prop",
        message: `${name}: \`${prop}\` isn't a prop of \`${block}\`, so it's ignored. Use ${list}.`,
      });
  }
}

function tabs(node: ElementNode, walk: Walk, name?: string) {
  const group = node[0] === "code-group";
  name ??= group ? `\`::code-group\` ${++walk.groups}` : `\`::tabs\` ${++walk.tabs}`;
  unknownProps(node, name, group ? "::code-group" : "::tabs", walk);
  if (group) codeGroup(node, name, walk);
  const attrs = resolve(node, walk);
  const items: ElementNode[] = [];
  for (const child of childrenOf(node).filter(isContent)) {
    if (isElement(child) && child[0] === "tabs-item") items.push(child);
    else
      walk.issues.push({
        rule: "comark/tabs/content-outside-tab",
        message: `${name}: put each tab in \`:::tabs-item{label="..."}\`. Found ${describe(child)} outside a tab, so it doesn't render.`,
      });
  }
  if (!items.length)
    walk.issues.push({
      rule: "comark/tabs/empty-tabs",
      message: node[1].code
        ? `${name} has no code blocks. Put fenced code blocks inside it, or remove it.`
        : `${name} has no tabs. Put \`:::tabs-item{label="..."}\` blocks inside it, or remove it.`,
    });
  const labels: string[] = [];
  for (const [index, item] of items.entries()) {
    const props = resolve(item, walk);
    if (!node[1].code) unknownProps(item, `${name}, tab ${index + 1}`, ":::tabs-item", walk);
    let label = text(props.label);
    if (!label) {
      label = `Tab ${index + 1}`;
      walk.issues.push({
        rule: "comark/tabs/missing-label",
        message: `${name}, tab ${index + 1}: \`label\` is required. Write \`:::tabs-item{label="..."}\`.`,
      });
    }
    if (labels.includes(label))
      walk.issues.push({
        rule: "comark/tabs/duplicate-label",
        message: `${name}: two tabs are labelled "${label}". Labels must differ, because \`sync\` matches tabs by label.`,
      });
    labels.push(label);
    item[1] = { label, index: String(index + 1) };
    const icon = text(props.icon) || walk.labelIcons.get(label.toLowerCase());
    if (icon) walk.icons.push({ block: node, index, value: icon, name });
  }
  const sync = text(attrs.sync);
  const code = node[1].code;
  node[1] = { uid: `${walk.prefix}-${++walk.blocks}`, count: String(items.length), labels };
  if (sync) node[1].sync = sync;
  if (code) node[1].code = "true";
  node.splice(2, node.length - 2, ...items);
}

// An `npm2yarn` code block of npm commands becomes a code group with a tab per package manager, synced with the
// page's other `sync="pm"` blocks. A manager with no form for one of its commands gets no tab.
function packageManagers(node: ElementNode, walk: Walk) {
  const name = `\`npm2yarn\` block ${++walk.npm2yarn}`;
  const attrs = { ...node[1] };
  const meta = text(attrs.meta).replace(NPM2YARN, " ").trim();
  if (meta) attrs.meta = meta;
  else delete attrs.meta;
  const code = childrenOf(node)[0];
  const codeAttrs = isElement(code) ? code[1] : {};
  const source = textContent(node);
  const blocks: ElementNode[] = [];
  const failed = new Map<string, PackageManager[]>();
  for (const manager of walk.managers) {
    const result = translate(source, manager);
    for (const command of result.failed)
      failed.set(command, [...(failed.get(command) ?? []), manager]);
    if (!result.failed.length)
      blocks.push([
        "pre",
        { ...attrs, filename: manager },
        ["code", { ...codeAttrs }, result.code],
      ]);
  }
  // The block is written in npm, so npm always keeps a tab when another manager loses one.
  if (failed.size && !blocks.some((block) => block[1].filename === "npm"))
    blocks.unshift(["pre", { ...attrs, filename: "npm" }, ["code", { ...codeAttrs }, source]]);
  if (!hasCommand(source))
    walk.issues.push({
      rule: "comark/tabs/no-npm-command",
      message: `${name} has no npm or npx command, so every tab shows the same code. Write the commands in npm, such as \`npm install\`.`,
    });
  for (const [command, managers] of failed)
    walk.issues.push({
      rule: "comark/tabs/no-manager-form",
      message: `${name}: \`${clip(command)}\` has no ${or.format(managers)} form, so ${managers.length > 1 ? "those tabs are" : "that tab is"} left out. Write the block as a \`::code-group{sync="pm"}\` by hand.`,
    });
  node[0] = "code-group";
  node[1] = { sync: "pm" };
  node.splice(2, node.length - 2, ...blocks);
  tabs(node, walk, name);
}

// Each block gets `icons`, one per tab or null, and each tab its own `icon`, so the strip and the captions both draw it.
async function addIcons(walk: Walk, resolver: Icons) {
  if (!walk.icons.length) return;
  const resolved = await resolver.resolve(walk.icons.map(({ value }) => value));
  const blocks = new Map<ElementNode, (IconData | null)[]>();
  for (const { block, index, value, name } of walk.icons) {
    const icon = resolved.get(value);
    const where = `${name}, tab ${index + 1}`;
    if (!icon) continue;
    if ("problem" in icon) {
      walk.issues.push({
        rule: iconProblemRule(icon),
        message: `${where}, icon "${clip(value)}": ${describeIconProblem(value, icon)}`,
      });
      continue;
    }
    const icons = blocks.get(block) ?? childrenOf(block).map(() => null);
    icons[index] = icon;
    blocks.set(block, icons);
    const item = childrenOf(block)[index];
    if (isElement(item)) item[1].icon = icon;
  }
  for (const [block, icons] of blocks) block[1].icons = icons;
}

// Every renderer gets tabs with their label and position, so none of them has to split rendered children.
function normalize(nodes: Node[], walk: Walk, inTabs = false) {
  for (const node of nodes) {
    if (!isElement(node)) continue;
    if (node[0] === "tabs-item" && !inTabs) {
      const label = text(resolve(node, walk).label);
      walk.issues.push({
        rule: "comark/tabs/stray-tabs-item",
        message: `\`:::tabs-item\` ${++walk.strays}${label ? ` ("${label}")` : ""} sits outside \`::tabs\`, so it renders as plain content. Wrap it in \`::tabs\`, or remove the \`:::tabs-item\` fence.`,
      });
      node[0] = "div";
      node[1] = {};
    }
    if (node[0] === "pre" && NPM2YARN.test(text(node[1].meta))) packageManagers(node, walk);
    else if (node[0] === "tabs" || node[0] === "code-group") tabs(node, walk);
    normalize(childrenOf(node), walk, node[0] === "tabs");
  }
}

/**
 * Turns `::tabs` with `:::tabs-item{label}` blocks, `::code-group` with labelled code blocks, and code blocks marked
 * `npm2yarn`, into tabs. Without a script every tab shows under its label; the script adds the tab strip, keys, and
 * `sync`. Problems, such as content outside every tab, are added to `meta.issues`.
 */
export default defineComarkPlugin<TabsOptions, TabsMeta>((options = {}) => {
  const resolver = options.iconResolver ?? createIcons();
  return {
    name: "comark-tabs",
    async post(state) {
      const { tree } = state;
      const walk: Walk = {
        data: { frontmatter: tree.frontmatter, meta: tree.meta, data: {}, props: {} },
        issues: [],
        labelIcons: new Map(
          Object.entries(options.icons ?? {}).map(([label, icon]) => [label.toLowerCase(), icon]),
        ),
        icons: [],
        tabs: 0,
        groups: 0,
        strays: 0,
        blocks: 0,
        npm2yarn: 0,
        managers: options.managers ?? defaultManagers,
        prefix: `ct-${hash(state.markdown)}`,
      };
      normalize(tree.nodes, walk);
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
