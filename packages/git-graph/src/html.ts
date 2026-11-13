import type { NodeHandler } from "comark";
import { css } from "./styles.ts";
import { attr } from "../../../shared/html.ts";
import { rawText } from "../../../shared/text.ts";

export { default } from "./index.ts";
export type { GitGraphAttributes, GitGraphLinesAttributes, GitGraphMeta } from "./index.ts";

// Each render gets a fresh `state.context`, so a document carries the styles once.
const styled = new WeakSet<object>();

const gitGraph: NodeHandler = async (node, state) => {
  const styles = styled.has(state.context) ? "" : `<style data-comark-git-graph>${css}</style>`;
  styled.add(state.context);
  const label = rawText(node[1].label);
  return `${styles}<figure class="cgg" data-comark-frame data-not-typeset${label ? ` aria-label="${attr(label)}"` : ""}>${await state.flow(node, state)}</figure>`;
};

// The parse plugin drew the SVG and escaped every text in it.
const gitGraphLines: NodeHandler = ([, attrs]) =>
  `<div class="cgg-lines">${rawText(attrs.svg)}</div>`;

/** The HTML renderer for `::git-graph`. Pass it as `components`; it inlines the styles once per document. */
export const components: Record<"git-graph" | "git-graph-lines", NodeHandler> = {
  "git-graph": gitGraph,
  "git-graph-lines": gitGraphLines,
};
