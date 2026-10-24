import type { NodeHandler } from "comark";
import { escapeHtml } from "comark/utils";
import { counterReset } from "./client.ts";
import { css } from "./styles.ts";

export { default } from "./index.ts";
export type { StepAttributes, StepsAttributes, StepsMeta } from "./index.ts";

// Each render gets a fresh `state.context`, so a document carries the styles once.
const styled = new WeakSet<object>();

const steps: NodeHandler = async (node, state) => {
  const styles = styled.has(state.context) ? "" : `<style data-comark-steps>${css}</style>`;
  styled.add(state.context);
  const reset = counterReset(node[1].start);
  const start = reset
    ? ` start="${escapeHtml(String(node[1].start))}" style="counter-reset:${reset}"`
    : "";
  return `${styles}<ol class="cs"${start}>${await state.flow(node, state)}</ol>`;
};

const step: NodeHandler = async (node, state) =>
  `<li class="cs-step">${await state.flow(node, state)}</li>`;

/** The HTML renderer for `::steps`. Pass it as `components`; it inlines the styles once per document. */
export const components: Record<"steps" | "step", NodeHandler> = { steps, step };
