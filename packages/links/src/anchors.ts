import type { ElementNode, Node } from "comark";
import { defineComarkPlugin } from "comark";
import { textContent } from "comark/utils";
import { text } from "./text.ts";

export interface AnchorsOptions {
  /** The heading levels that get a link. Default `[2, 3, 4]`. */
  levels?: number[];
  /** What screen readers hear for a heading's link, from the heading's text. Default `Section titled "…"`. */
  label?: (text: string) => string;
  /** What the link shows. Default `"#"`. */
  icon?: string;
}

/** What the plugin writes on a heading as its `anchor` attribute, for the components to draw. */
export type Anchor = { label: string; icon: string };

const isElement = (node: Node): node is ElementNode => Array.isArray(node) && node[0] !== null;
const HEADING = /^h([1-6])$/;
const SKIP = new Set(["code", "pre"]);

/**
 * Marks the headings that get a `#` link to themselves. The heading stays where it is in the tree, so a table of
 * contents still finds it; the renderers' components draw the link beside it. A heading without an id gets none.
 */
export const anchors = defineComarkPlugin<AnchorsOptions>((options = {}) => {
  const levels = new Set(options.levels ?? [2, 3, 4]);
  const label = options.label ?? ((text: string) => `Section titled "${text}"`);
  const icon = options.icon ?? "#";

  function walk(nodes: Node[]) {
    for (const node of nodes) {
      if (!isElement(node) || SKIP.has(node[0])) continue;
      const level = HEADING.exec(node[0])?.[1];
      if (level) {
        if (levels.has(Number(level)) && text(node[1].id)) {
          const anchor: Anchor = { label: label(textContent(node).trim()), icon };
          node[1].anchor = anchor;
        }
        continue;
      }
      // SAFETY: an element node is [tag, attributes, ...children], so everything after index 1 is a child node.
      walk(node.slice(2) as Node[]);
    }
  }

  return {
    name: "comark-links-anchors",
    post(state) {
      walk(state.tree.nodes);
    },
  };
});
