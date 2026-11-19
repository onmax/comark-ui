import { defineComarkPlugin } from "comark";

export { typesetCss, typesetStylesheet } from "./typeset-css.ts";

/** The node that adds the styles. The plugin adds one at the start of every document. */
export const TYPESET_TAG = "typeset-styles";

const isTypeset = (node: unknown) => Array.isArray(node) && node[0] === TYPESET_TAG;

/**
 * Adds the node that writes the typeset styles at the start of the document. The preset turns it on by default.
 *
 * The node goes first because renderers match a document's blocks by index: at the end, every block a stream adds
 * would replace the `<style>`, and each new stylesheet restyles the whole document. A streaming parse keeps the
 * previous tree's first nodes, so the node may already be there.
 */
export const typeset = defineComarkPlugin(() => ({
  name: "comark-ui-typeset",
  post(state) {
    state.tree.nodes = [[TYPESET_TAG, {}], ...state.tree.nodes.filter((node) => !isTypeset(node))];
  },
}));
