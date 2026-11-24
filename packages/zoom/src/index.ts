import type { ElementNode, Node } from "comark";
import { defineComarkPlugin } from "comark";
import { measure } from "./size.ts";
import { isElement } from "../../../shared/nodes.ts";
import { text } from "../../../shared/text.ts";

export interface ZoomOptions {
  /** Make every content image zoomable. Images inside links keep their link. Default `true`. */
  images?: boolean;
  /**
   * Give images their `width` and `height` while parsing. By default only data URIs are measured. `true` also
   * fetches remote URLs, including redirects, so enable it only for trusted documents. `false` disables measurement.
   * An image with one side keeps it and gets the other at its ratio.
   */
  size?: boolean;
  /**
   * Draw an image in a table cell as a small thumbnail that zooms, even when `images` is `false`, so a table can hold a
   * screenshot per row. Default `true`.
   */
  thumbnails?: boolean;
}

/** The node that starts the zoom script. The plugin adds one at the end of a document that has anything to zoom. */
export const RUNTIME_TAG = "zoom-runtime";

// Blocks that zoom as a whole, by the plugin that draws them; without it, a block of that name is the app's own.
const WHOLE = {
  carousel: "comark-carousel",
  slide: "comark-carousel",
  screenshot: "comark-annotate",
  compare: "comark-annotate",
};

const off = (value: unknown) => value === false || value === "false";

// Marks images with the same attributes a `::zoom` block gets, so every renderer outputs zoomable images unchanged.
// An element marked by hand gets the same; `{zoom=false}` on an image, or `data-zoom=false` anywhere, opts out.
// An image in a table cell is a thumbnail: marked for the styles that keep its row short, and loaded only once near
// the screen, since a table may hold one per row. `{link="…"}` on a zoomable image names the page it shows, which the
// zoomed view links to; on the image itself a link would take the click that zooms it.
function mark(
  nodes: Node[],
  images: boolean,
  thumbnails: boolean,
  whole: Set<string>,
  skip = false,
  cell = false,
): boolean {
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
    const thumbnail = tag === "img" && thumbnails && cell && !skip && !off(hand);
    const link = tag === "img" ? text(attrs.link) : "";
    if (tag === "img") delete attrs.link;
    if (off(hand)) delete attrs["data-zoom"];
    else if (hand !== undefined || thumbnail || (tag === "img" && images && !skip)) {
      attrs["data-zoom"] = "";
      attrs.tabindex ??= "0";
      if (link) attrs["data-zoom-href"] = link;
      if (thumbnail) {
        attrs["data-zoom-thumb"] = "";
        attrs.loading ??= "lazy";
        attrs.decoding ??= "async";
      }
      found = true;
    }
    if (
      mark(
        // SAFETY: an element node is [tag, attributes, ...children], so everything after index 1 is a child node.
        node.slice(2) as Node[],
        images,
        thumbnails,
        whole,
        skip || tag === "a" || whole.has(tag),
        cell || tag === "td" || tag === "th",
      )
    )
      found = true;
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
async function size([, attrs]: ElementNode, remote: boolean) {
  if (attrs.width !== undefined && attrs.height !== undefined) return;
  const width = pixels(attrs.width);
  const height = pixels(attrs.height);
  if ((attrs.width !== undefined && !width) || (attrs.height !== undefined && !height)) return;
  const measured = await measure(String(attrs.src), { remote });
  if (!measured) return;
  const ratio = measured.height / measured.width;
  attrs.width = String(width ?? (height ? Math.round(height / ratio) : measured.width));
  attrs.height = String(height ?? (width ? Math.round(width * ratio) : measured.height));
}

// A thumbnail fits a box of a set height and width, which CSS can't work out from the `width` and `height` attributes
// in every browser, so it gets its ratio. With it the thumbnail has its final size before its file loads.
function proportion([, attrs]: ElementNode) {
  const width = pixels(attrs.width);
  const height = pixels(attrs.height);
  if (!("data-zoom-thumb" in attrs) || !width || !height) return;
  const ratio = `--cz-ratio:${Math.round((width / height) * 1000) / 1000}`;
  const style = text(attrs.style);
  attrs.style = style ? `${style};${ratio}` : ratio;
}

/**
 * Zooms images and `::zoom` blocks like medium-zoom: out of their place on the page, closed with Escape, Back, or a
 * click around them. Items with the same `group` page through one zoomed view with a strip of them at the bottom.
 */
export default /* @__PURE__ */ defineComarkPlugin<ZoomOptions>((options) => ({
  name: "comark-zoom",
  async post(state) {
    const { nodes } = state.tree;
    const plugins = new Set(state.options.plugins?.map((plugin) => plugin.name));
    const drawn = Object.entries(WHOLE).filter(([, plugin]) => plugins.has(plugin));
    const whole = new Set(["zoom", ...drawn.map(([tag]) => tag)]);
    if (mark(nodes, options?.images ?? true, options?.thumbnails ?? true, whole))
      nodes.push([RUNTIME_TAG, {}]);
    const found = images(nodes);
    if (options?.size !== false)
      await Promise.all(found.map((node) => size(node, options?.size === true)));
    found.forEach(proportion);
  },
}));
