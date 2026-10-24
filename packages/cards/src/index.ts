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
import { isExternalHref, isSafeHref } from "./client.ts";

export type CardsOptions = {
  /**
   * Resolves the cards' `icon`, from `createIcons()` in comark-icon. Pass the one the page's other plugins use, so they
   * share its `collections` and `fetch`. By default icons come from the Iconify API.
   */
  iconResolver?: Icons;
};

export type CardsMeta = {
  /** One readable sentence per problem with a `::card` or `::columns`. Empty when there are none. Other plugins add theirs too. */
  issues: string[];
  /** The comark-linter rule of each issue, by its sentence, so the linter reports it under its own code. */
  issueRules: Record<string, string>;
};

type Issue = { rule: `comark/cards/${string}` | `comark/icon/${string}`; message: string };

/** Nuxt UI's colors, which tint a card's icon and border, and its background with a `variant`. */
export const colors = [
  "primary",
  "secondary",
  "success",
  "info",
  "warning",
  "error",
  "neutral",
] as const;

export type CardColor = (typeof colors)[number];

/**
 * Nuxt UI's card variants that a document block needs: `outline`, the default, keeps the plain card, `soft` washes it
 * in its color, and `subtle` washes it and draws its border in the color too.
 */
export const variants = ["outline", "soft", "subtle"] as const;

export type CardVariant = (typeof variants)[number];

/**
 * What a `::card` becomes. A link card has `to`, its `target`, `external` when it opens in a new tab, and `label`, the
 * link's name. `variant` is only written when it isn't `outline`. Its title, when it has one, is a `card-title` node
 * before its content.
 */
export type CardAttributes = {
  color?: CardColor;
  variant?: Exclude<CardVariant, "outline">;
  to?: string;
  target?: string;
  external?: string;
  label?: string;
  icon?: IconData;
};

/** What a `::columns` becomes: how many columns, with each cell a `column` node. */
export type ColumnsAttributes = { cols?: string };

type Data = Parameters<typeof resolveAttributes>[1];

const isElement = (node: Node | undefined): node is ElementNode =>
  Array.isArray(node) && node[0] !== null;
// Comments render nothing, so they aren't content a card would show.
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
const isColor = (value: string): value is CardColor => colors.some((color) => color === value);
const isVariant = (value: string): value is CardVariant =>
  variants.some((variant) => variant === value);
const isTemplate = (node: Node, name: string): node is ElementNode =>
  isElement(node) && node[0] === "template" && node[1].name === name;
// A paragraph Comark wraps around a slot's only line, which a title, drawn as one paragraph, can't hold.
const unwrap = (nodes: Node[]) =>
  nodes
    .filter(isContent)
    .flatMap((node) => (isElement(node) && node[0] === "p" ? childrenOf(node) : [node]));

interface Walk {
  data: Data;
  issues: Issue[];
  icons: { card: ElementNode; value: string; name: string }[];
  cards: number;
  columns: number;
}

const resolve = (node: ElementNode, walk: Walk) =>
  resolveAttributes(node[1], walk.data, { parseJson: true });

const CARD_PROPS = ["title", "description", "icon", "to", "href", "target", "color", "variant"];

// A prop that isn't one, such as `link` or `columns`, is dropped without a trace, so each one is named.
function unknownProps(node: ElementNode, name: string, block: string, props: string[], walk: Walk) {
  const known = props.flatMap((prop) => (prop === "href" ? [] : [`\`${prop}\``]));
  const list = known.length > 1 ? `${known.slice(0, -1).join(", ")}, or ${known.at(-1)}` : known[0];
  for (const key of Object.keys(node[1])) {
    const prop = key.replace(/^:/, "");
    if (!props.includes(prop) && prop !== "id" && prop !== "class")
      walk.issues.push({
        rule: "comark/cards/unknown-prop",
        message: `${name}: \`${prop}\` isn't a prop of \`${block}\`, so it's ignored. Use ${list}.`,
      });
  }
}

function card(node: ElementNode, walk: Walk) {
  const attrs = resolve(node, walk);
  const children = childrenOf(node);
  const slot = children.find((child) => isTemplate(child, "title"));
  const content = children.flatMap((child) =>
    child === slot ? [] : isTemplate(child, "default") ? childrenOf(child) : [child],
  );
  const title = slot ? unwrap(childrenOf(slot)) : text(attrs.title) ? [text(attrs.title)] : [];
  const words = clip(textContent(["p", {}, ...title]));
  const name = `\`::card\` ${++walk.cards}${words ? ` ("${words}")` : ""}`;
  unknownProps(node, name, "::card", CARD_PROPS, walk);
  const description = text(attrs.description);
  if (!content.some(isContent) && description) content.push(["p", {}, description]);
  const written = text(attrs.color);
  const result: Record<string, string> = {};
  result.color = isColor(written) ? written : "primary";
  if (written && !isColor(written))
    walk.issues.push({
      rule: "comark/cards/invalid-color",
      message: `${name}: \`color\` is "${clip(written)}", so it shows as primary. Write one of ${colors.join(", ")}.`,
    });
  const variant = text(attrs.variant);
  if (isVariant(variant)) {
    if (variant !== "outline") result.variant = variant;
  } else if (variant)
    walk.issues.push({
      rule: "comark/cards/invalid-variant",
      message: `${name}: \`variant\` is "${clip(variant)}", so it shows as outline. Write one of ${variants.join(", ")}.`,
    });
  let to = text(attrs.to);
  const href = text(attrs.href);
  if (href && !to) {
    walk.issues.push({
      rule: "comark/cards/href-instead-of-to",
      message: `${name}: Nuxt UI links a card with \`to\`, so it ignores \`href\`. Write \`to="${clip(href)}"\` instead.`,
    });
    to = href;
  }
  // A `javascript:` link would run on a click anywhere on the card.
  if (to && !isSafeHref(to)) {
    walk.issues.push({
      rule: "comark/cards/unsafe-link",
      message: `${name}: \`to\` must be a page or a web address, so it isn't a link.`,
    });
    to = "";
  }
  if (to) {
    result.to = to;
    const target = text(attrs.target) || (isExternalHref(to) ? "_blank" : "");
    if (target) result.target = target;
    if (target === "_blank") result.external = "true";
    result.label = words || "Card link";
  }
  const icon = text(attrs.icon);
  if (icon) walk.icons.push({ card: node, value: icon, name });
  node[1] = result;
  const head: ElementNode[] = title.length ? [["card-title", {}, ...title]] : [];
  node.splice(2, node.length - 2, ...head, ...content);
}

function columns(node: ElementNode, walk: Walk) {
  const name = `\`::columns\` ${++walk.columns}`;
  unknownProps(node, name, "::columns", ["cols"], walk);
  const written = text(resolve(node, walk).cols);
  let cols = "2";
  if (/^[1-6]$/.test(written)) cols = written;
  else if (written)
    walk.issues.push({
      rule: "comark/cards/invalid-cols",
      message: `${name}: \`cols\` is "${clip(written)}", so it shows 2 columns. Write a number from 1 to 6.`,
    });
  // Each block is a cell, unless `:::column` groups several into one.
  const cells = childrenOf(node)
    .filter(isContent)
    .map((child): ElementNode =>
      isElement(child) && child[0] === "column"
        ? ["column", {}, ...childrenOf(child)]
        : ["column", {}, child],
    );
  if (!cells.length)
    walk.issues.push({
      rule: "comark/cards/empty-columns",
      message: `${name} is empty. Put a block inside for each column, or remove it.`,
    });
  node[1] = { cols };
  node.splice(2, node.length - 2, ...cells);
}

function transform(nodes: Node[], walk: Walk) {
  for (const node of nodes) {
    if (!isElement(node)) continue;
    if (node[0] === "card") card(node, walk);
    else if (node[0] === "columns") columns(node, walk);
    else if (node[0] === "card-group") node[1] = {};
    transform(childrenOf(node), walk);
  }
}

async function addIcons(walk: Walk, resolver: Icons) {
  if (!walk.icons.length) return;
  const resolved = await resolver.resolve(walk.icons.map(({ value }) => value));
  for (const { card: node, value, name } of walk.icons) {
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
 * Turns `::card-group` and `::card{title description icon to target color variant}` into cards, link cards when they
 * have `to`, and `::columns{cols}` into a grid with a cell per block. Problems are added to `meta.issues`.
 */
export default defineComarkPlugin<CardsOptions, CardsMeta>((options = {}) => {
  const resolver = options.iconResolver ?? createIcons();
  return {
    name: "comark-cards",
    async post(state) {
      const { tree } = state;
      const walk: Walk = {
        data: { frontmatter: tree.frontmatter, meta: tree.meta, data: {}, props: {} },
        issues: [],
        icons: [],
        cards: 0,
        columns: 0,
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
