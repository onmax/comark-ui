import { defineComarkPlugin, type Node } from "comark";
import { childrenOf, isElement } from "../../../shared/nodes.ts";

export { typesetCss, typesetStylesheet } from "./typeset-css.ts";

/** The node that adds the styles. The plugin adds one at the start of every document. */
export const TYPESET_TAG = "typeset-styles";

const isTypeset = (node: unknown) => Array.isArray(node) && node[0] === TYPESET_TAG;

function pixels(value: unknown) {
  if (typeof value !== "number" && (typeof value !== "string" || !/^\d+$/.test(value))) return 0;
  const size = Number(value);
  return Number.isSafeInteger(size) && size > 0 ? size : 0;
}

function sizeImages(nodes: Node[]): Node[] {
  return nodes.map((node) => {
    if (!isElement(node)) return node;
    const [tag, attrs] = node;
    if (tag !== "img") {
      const children = sizeImages(childrenOf(node));
      return children.some((child, index) => child !== node[index + 2])
        ? [tag, attrs, ...children]
        : node;
    }
    const width = pixels(attrs.width);
    const height = pixels(attrs.height);
    const style = attrs.style;
    if (!width || !height || (style !== undefined && typeof style !== "string")) return node;
    if (style?.includes("--_ty-image-w:")) return node;
    return [
      tag,
      {
        ...attrs,
        style: `${style ? `${style};` : ""}--_ty-image-w:${width};--_ty-image-h:${height}`,
      },
      ...childrenOf(node),
    ];
  });
}

/**
 * Adds the node that writes the typeset styles at the start of the document. The preset turns it on by default.
 *
 * The node goes first because renderers match a document's blocks by index: at the end, every block a stream adds
 * would replace the `<style>`, and each new stylesheet restyles the whole document. A streaming parse keeps the
 * previous tree's first nodes, so the node may already be there.
 *
 * React and Vue 0.9 insert the caret by mutating the last node with text children. For those renderers we end
 * with invisible text to use their non-mutating sibling fallback, even when they stream a finished parse.
 */
export const typeset = defineComarkPlugin(
  ({ caretFallback = false }: { caretFallback?: boolean } = {}) => ({
    name: "comark-ui-typeset",
    post(state) {
      const nodes = state.tree.nodes.filter(
        (node) => !isTypeset(node) && (!caretFallback || node !== ""),
      );
      state.tree.nodes = [[TYPESET_TAG, {}], ...sizeImages(nodes), ...(caretFallback ? [""] : [])];
    },
  }),
);
