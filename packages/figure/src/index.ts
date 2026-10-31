import type { ElementNode, Node } from "comark";
import { defineComarkPlugin } from "comark";
import { text } from "../../../shared/text.ts";
import { childrenOf, isElement } from "../../../shared/nodes.ts";

export interface FigureOptions {
  /** Lift every image that stands alone in its paragraph out of the `<p>`, captioned or not. Default `false`. */
  unwrap?: boolean;
}

const isRaw = (node: ElementNode) => Boolean(node[1].$?.html);
// Comments are arrays with a null tag and render nothing, so they don't keep an image from standing alone.
const isContent = (node: Node) => (Array.isArray(node) ? node[0] !== null : node.trim() !== "");
const only = (node: ElementNode) => {
  const content = childrenOf(node).filter(isContent);
  return content.length === 1 ? content[0] : undefined;
};
const imageOf = (node: Node | undefined) => {
  if (!isElement(node)) return;
  if (isRaw(node)) return;
  if (node[0] === "img") return node;
  const inner = node[0] === "a" ? only(node) : undefined;
  return isElement(inner) && !isRaw(inner) && inner[0] === "img" ? inner : undefined;
};
// Comark drops the paragraph around an image alone in these, so the image is their only child. A component does the
// same, but so does an inline component alone on its line, and the tree doesn't tell them apart.
const UNWRAPPED = new Set(["li", "blockquote", "dd"]);
// Whose children are inline: an image in them is part of a line, never a figure.
const INLINE = new Set(
  "p h1 h2 h3 h4 h5 h6 dt td th pre code a abbr b cite del dfn em i ins kbd mark q s samp small span strong sub sup u var label button summary caption figcaption".split(
    " ",
  ),
);

/** The image, or the link around it, as a figure captioned by the image's title; nothing if it has no title. */
function figure(picture: ElementNode): ElementNode | undefined {
  const image = imageOf(picture);
  const title = text(image?.[1].title);
  if (!image || !title) return;
  delete image[1].title;
  return ["figure", {}, picture, ["figcaption", {}, title]];
}

function walk(nodes: Node[], start: number, unwrap: boolean) {
  for (let index = start; index < nodes.length; index++) {
    const node = nodes[index];
    if (!isElement(node)) continue;
    if (isRaw(node)) continue;
    const [tag] = node;
    if (tag === "p") {
      const picture = only(node);
      if (!imageOf(picture) || !isElement(picture)) continue;
      const lifted = figure(picture) ?? (unwrap ? picture : undefined);
      if (lifted) nodes[index] = lifted;
      continue;
    }
    if (INLINE.has(tag) || tag === "figure") continue;
    if (UNWRAPPED.has(tag)) {
      const picture = only(node);
      const captioned = isElement(picture) ? figure(picture) : undefined;
      if (captioned) {
        nodes[index] = [tag, node[1], captioned];
        continue;
      }
    }
    // SAFETY: an element node is [tag, attributes, ...children], so its children start at index 2.
    walk(node as Node[], 2, unwrap);
  }
}

/**
 * An image alone in its paragraph with a title, `![alt](src "Caption")`, becomes a `<figure>` with the title as its
 * `<figcaption>`. The alt text stays on the image. With `unwrap`, every image alone in its paragraph leaves the `<p>`.
 */
export default defineComarkPlugin<FigureOptions>((options) => ({
  name: "comark-figure",
  post(state) {
    walk(state.tree.nodes, 0, options?.unwrap ?? false);
  },
}));
