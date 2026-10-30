import type { ElementNode, Node } from "comark";
import { defineComarkPlugin } from "comark";
import { measure } from "./size.ts";

export interface ZoomOptions {
  /** Make every content image zoomable. Images inside links keep their link. Default `true`. */
  images?: boolean;
  /**
   * Give every image at a URL or in a data URI its `width` and `height`, read from its first bytes while
   * parsing, so the page keeps its room before it loads. An image with one of them keeps it and gets the other at its
   * ratio. Default `true`.
   */
  size?: boolean;
}

/** The node that starts the zoom script. The plugin adds one at the end of a document that has anything to zoom. */
export const RUNTIME_TAG = "zoom-runtime";

const isElement = (node: Node): node is ElementNode => Array.isArray(node) && node[0] !== null;
// Blocks that zoom as a whole, so the images inside them don't zoom on their own.
const WHOLE = new Set(["zoom", "carousel", "slide", "screenshot", "compare"]);

const off = (value: unknown) => value === false || value === "false";

// Marks images with the same attributes a `::zoom` block gets, so every renderer outputs zoomable images unchanged.
// An element marked by hand gets the same; `{zoom=false}` on an image, or `data-zoom=false` anywhere, opts out.
function mark(nodes: Node[], images: boolean, skip = false): boolean {
  let found = false;
  for (const node of nodes) {
    if (!isElement(node)) continue;
    const [tag, attrs] = node;
    if (tag === "zoom") found = true;
    // `{data-zoom}` arrives as a binding, which renderers would output as `data-zoom="true"`.
    let hand = attrs[":data-zoom"] ?? attrs["data-zoom"];
    delete attrs[":data-zoom"];
    if (tag === "img" && off(attrs.zoom)) {
      hand = false;
      delete attrs.zoom;
    }
    if (off(hand)) delete attrs["data-zoom"];
    else if (hand !== undefined || (tag === "img" && images && !skip)) {
      attrs["data-zoom"] = "";
      attrs.tabindex ??= "0";
      found = true;
    }
    // SAFETY: an element node is [tag, attributes, ...children], so everything after index 1 is a child node.
    if (mark(node.slice(2) as Node[], images, skip || tag === "a" || WHOLE.has(tag))) found = true;
  }
  return found;
}

const pixels = (value: unknown) => {
  const parsed = Number(value);
  return parsed > 0 ? parsed : undefined;
};

function images(nodes: Node[], found: ElementNode[] = []) {
  for (const node of nodes) {
    if (!isElement(node)) continue;
    if (node[0] === "img" && node[1].src !== undefined) found.push(node);
    // SAFETY: an element node is [tag, attributes, ...children], so everything after index 1 is a child node.
    images(node.slice(2) as Node[], found);
  }
  return found;
}

// Sets the sides an image lacks. A browser keeps that room until the picture loads, then takes the picture's own ratio.
// A side in other units, like `50%`, is the author's layout, so the image is left alone.
async function size([, attrs]: ElementNode) {
  if (attrs.width !== undefined && attrs.height !== undefined) return;
  const width = pixels(attrs.width);
  const height = pixels(attrs.height);
  if ((attrs.width !== undefined && !width) || (attrs.height !== undefined && !height)) return;
  const measured = await measure(String(attrs.src));
  if (!measured) return;
  const ratio = measured.height / measured.width;
  attrs.width = String(width ?? (height ? Math.round(height / ratio) : measured.width));
  attrs.height = String(height ?? (width ? Math.round(width * ratio) : measured.height));
}

/**
 * Zooms images and `::zoom` blocks like medium-zoom: out of their place on the page, closed with Escape, Back, or a
 * click around them. Items with the same `group` page through one zoomed view with a strip of them at the bottom.
 */
export default /* @__PURE__ */ defineComarkPlugin<ZoomOptions>((options) => ({
  name: "comark-zoom",
  async post(state) {
    const { nodes } = state.tree;
    if (mark(nodes, options?.images ?? true)) nodes.push([RUNTIME_TAG, {}]);
    if (options?.size !== false) await Promise.all(images(nodes).map(size));
  },
}));
