import type { ElementNode, Node } from "comark";
import { defineComarkPlugin } from "comark";
import { resolveAttributes } from "comark/render";
import { textContent } from "comark/utils";
import { text } from "../../../shared/text.ts";
import { childrenOf, isElement } from "../../../shared/nodes.ts";

export type CarouselMeta = {
  /** One readable sentence per problem with a `::carousel` or `:::slide`. Empty when the document has none. */
  issues: string[];
  /** The comark-linter rule of each issue, by its sentence, so the linter reports it under its own code. */
  issueRules: Record<string, string>;
};

type Issue = { rule: `comark/carousel/${string}`; message: string };

type Data = Parameters<typeof resolveAttributes>[1];

// Comments are arrays with a null tag and render nothing, so they aren't slides either.
const isContent = (node: Node) => (Array.isArray(node) ? node[0] !== null : node.trim() !== "");
const isSlide = (node: Node): node is ElementNode => isElement(node) && node[0] === "slide";
const hasImage = (nodes: Node[]): boolean =>
  nodes.some((node) => isElement(node) && (node[0] === "img" || hasImage(childrenOf(node))));
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
  const kind = KINDS.get(tag) ?? (/^h[1-6]$/.test(tag) ? "heading" : `::${tag} block`);
  const words = clip(tag === "img" ? text(attrs.alt) : textContent(node));
  return `the ${kind}${words ? ` "${words}"` : ""}`;
}

const only = (node: ElementNode) => {
  const content = childrenOf(node).filter(isContent);
  return content.length === 1 ? content[0] : undefined;
};
// An image, or a link around nothing but an image.
const isPicture = (node: Node | undefined): node is ElementNode =>
  isElement(node) &&
  (node[0] === "img" || (node[0] === "a" && isElement(only(node)) && only(node)?.[0] === "img"));

// The styles center a picture that is a direct child of a slide, so only one that stands alone may be one: a picture
// alone in its paragraph leaves it, and a picture in a sentence gets back the paragraph Comark drops around a slide
// that is a single paragraph.
function standalone(nodes: Node[]): Node[] {
  const lifted = nodes.map((node) => {
    if (!isElement(node) || node[0] !== "p") return node;
    const content = only(node);
    return isPicture(content) ? content : node;
  });
  const inline =
    lifted.some(isPicture) && lifted.some((node) => !Array.isArray(node) && isContent(node));
  return inline ? [["p", {}, ...lifted]] : lifted;
}

const COLUMNS = new Set<unknown>([1, 2, 3, "1", "2", "3"]);
const CAROUSEL_PROPS = ["title", "columns", "zoom", "id", "class"];
const SLIDE_PROPS = ["title", "id", "class"];

const unknownProps = (attrs: ElementNode[1], props: string[]) =>
  Object.keys(attrs)
    .map((key) => key.replace(/^:/, ""))
    .filter((prop) => !props.includes(prop));

interface Walk {
  data: Data;
  issues: Issue[];
  carousels: number;
  strays: number;
}

function carousel(node: ElementNode, walk: Walk) {
  const attrs = resolveAttributes(node[1], walk.data, { parseJson: true });
  const title = text(attrs.title);
  const name = `carousel ${++walk.carousels}${title ? ` ("${title}")` : ""}`;
  for (const prop of unknownProps(node[1], CAROUSEL_PROPS))
    walk.issues.push({
      rule: "comark/carousel/unknown-prop",
      message: `${name}: \`${prop}\` isn't a prop of ::carousel, so it's ignored. Use \`title\`, \`columns\`, or \`zoom\`.`,
    });
  const content = childrenOf(node).filter(isContent);
  const explicit = content.some(isSlide);
  if (explicit)
    for (const child of content.filter((child) => !isSlide(child)))
      walk.issues.push({
        rule: "comark/carousel/content-outside-slide",
        message: `${name} drops ${describe(child)} because it sits outside every :::slide; move it into a :::slide.`,
      });
  const slides: ElementNode[] = explicit
    ? content.filter(isSlide)
    : content.map((child) => ["slide", {}, child]);
  if (!slides.length)
    walk.issues.push({
      rule: "comark/carousel/empty-carousel",
      message: `${name} has no slides; put blocks or :::slide blocks inside it, or remove it.`,
    });
  for (const [index, slide] of slides.entries())
    for (const prop of unknownProps(slide[1], SLIDE_PROPS))
      walk.issues.push({
        rule: "comark/carousel/unknown-prop",
        message: `${name}, slide ${index + 1}: \`${prop}\` isn't a prop of :::slide, so it's ignored. Use \`title\`.`,
      });
  if (attrs.columns !== undefined && !COLUMNS.has(attrs.columns))
    walk.issues.push({
      rule: "comark/carousel/invalid-columns",
      message: `${name} has columns=${text(attrs.columns)}; use 1, 2, or 3.`,
    });
  // The renderers resolve these on the carousel, but the parse plugin passes them on to each slide.
  for (const key of ["zoom", "title"]) {
    const path = text(node[1][`:${key}`]).trim();
    if (attrs[key] !== undefined || !path) continue;
    walk.issues.push({
      rule: "comark/carousel/unresolved-binding",
      message: /^(?:data|props)\b/.test(path)
        ? `${name}: \`:${key}\` reads render-time data, which the slides can't follow; set it in the document or frontmatter.`
        : `${name}: \`:${key}\` points at ${path}, which is undefined. Fix the path or set \`${key}\` directly.`,
    });
  }
  const zoom = attrs.zoom !== false && attrs.zoom !== "false";
  for (const [index, slide] of slides.entries()) {
    slide.splice(2, slide.length - 2, ...standalone(childrenOf(slide)));
    slide[1].index = String(index + 1);
    slide[1].count = String(slides.length);
    if (!zoom) slide[1].zoom = "false";
    // An image names its zoomed view with its alt text; anything else would show an empty header.
    const titled = slide[1].title !== undefined || slide[1][":title"] !== undefined;
    if (title && !titled && !hasImage(childrenOf(slide))) slide[1].title = title;
  }
  node[1].count = String(slides.length);
  node.splice(2, node.length - 2, ...slides);
}

// Every renderer gets explicit slides with their position, so none of them has to split rendered children.
function normalize(nodes: Node[], walk: Walk, inCarousel = false) {
  for (const node of nodes) {
    if (!isElement(node)) continue;
    if (node[0] === "slide" && !inCarousel) {
      const title = text(resolveAttributes(node[1], walk.data, { parseJson: true }).title);
      walk.issues.push({
        rule: "comark/carousel/slide-outside-carousel",
        message: `:::slide ${++walk.strays}${title ? ` ("${title}")` : ""} sits outside a ::carousel, so it renders as plain content; wrap it in a ::carousel or remove the :::slide fence.`,
      });
      // A plain div, so no renderer gives it a position or a zoom that belongs to a carousel.
      node[0] = "div";
      node[1] = {};
    }
    if (node[0] === "carousel") carousel(node, walk);
    normalize(childrenOf(node), walk, node[0] === "carousel");
  }
}

/**
 * Turns `::carousel` into slides: every block inside it, or every `:::slide` when there are any. Slides scroll and
 * snap without a script; the script adds arrows, a counter, and keys, and zooms a slide with the others in a strip.
 * Problems, such as content outside every `:::slide`, are added to `meta.issues`.
 */
export default defineComarkPlugin<void, CarouselMeta>(() => ({
  name: "comark-carousel",
  post(state) {
    const { tree } = state;
    const walk: Walk = {
      data: { frontmatter: tree.frontmatter, meta: tree.meta, data: {}, props: {} },
      issues: [],
      carousels: 0,
      strays: 0,
    };
    normalize(tree.nodes, walk);
    tree.meta.issues = [...(tree.meta.issues ?? []), ...walk.issues.map((issue) => issue.message)];
    tree.meta.issueRules = {
      ...tree.meta.issueRules,
      ...Object.fromEntries(walk.issues.map((issue) => [issue.message, issue.rule])),
    };
  },
}));
