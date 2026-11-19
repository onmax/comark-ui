import { defineComarkPlugin } from "comark";

/** The node that starts the motion layer. The plugin adds one at the end of every document that has content. */
export const RUNTIME_TAG = "motion-runtime";

/**
 * Gives a document the motion of ViteHub UI: its buttons, links, tabs, chevrons, tooltips, and handles move by their
 * role, and the blocks' scripts get the motion helpers. It adds one `motion-runtime` node, which each renderer draws as
 * the start of the motion layer.
 */
export default defineComarkPlugin(() => ({
  name: "motion",
  post(state) {
    const nodes = state.tree.nodes;
    if (!nodes.length || nodes.some((node) => Array.isArray(node) && node[0] === RUNTIME_TAG)) return;
    nodes.push([RUNTIME_TAG, {}]);
  },
}));
