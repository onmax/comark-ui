import { defineComarkPlugin } from "comark";

export { typesetCss } from "./typeset-css.ts";

/** The node that adds the styles. The plugin adds one at the end of every document. */
export const TYPESET_TAG = "typeset-styles";

/** Adds the node that writes the typeset styles at the end of the document. The preset turns it on by default. */
export const typeset = defineComarkPlugin(() => ({
  name: "comark-ui-typeset",
  post(state) {
    state.tree.nodes.push([TYPESET_TAG, {}]);
  },
}));
