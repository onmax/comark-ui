import type { NodeHandler, State } from "comark";
import { css } from "./styles.ts";
import { attr } from "../../../shared/html.ts";

export { default, TIME_TAG } from "./index.ts";
export type { TimeAttributes, TimeMeta, TimeOptions } from "./index.ts";

// Each render gets a fresh `state.context`, so a document carries the styles once.
const styled = new WeakSet<object>();

const styles = ({ context }: State) => {
  if (styled.has(context)) return "";
  styled.add(context);
  return `<style data-comark-time>${css}</style>`;
};

const time: NodeHandler = ([, attrs], state) => {
  const { id, datetime, mode, label, tip } = attrs;
  if (!datetime || !label) return "";
  return (
    `${styles(state)}<time class="ctm" datetime="${attr(datetime)}" data-mode="${attr(mode)}" tabindex="0" aria-describedby="${attr(id)}">` +
    `${attr(label)}<span class="ctm-tip" role="tooltip" id="${attr(id)}"><span class="ctm-pill">${attr(tip)}</span></span></time>`
  );
};

/** The HTML renderer for `:time`. Pass it as `components`; it inlines the styles once per document. */
export const components: Record<"relative-time", NodeHandler> = { "relative-time": time };
