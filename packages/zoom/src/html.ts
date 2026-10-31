import type { NodeHandler, State } from "comark";
import { script } from "./script.ts";
import { RUNTIME_TAG } from "./index.ts";
import { css } from "./styles.ts";
import { attr } from "../../../shared/html.ts";

export { default, RUNTIME_TAG } from "./index.ts";
export type { ZoomOptions } from "./index.ts";
export type { ZoomDetail } from "./client.ts";

// Each render gets a fresh `state.context`, so a document carries the script once.
const started = new WeakSet<object>();

/** The zoom script as one inline `<script>`, once per render. Other plugins call it for the items they make zoomable. */
export function runtime(state: State): string {
  if (started.has(state.context)) return "";
  started.add(state.context);
  // The styles come inline before the script, so the script has nothing to add.
  return `<style data-comark-zoom>${css}</style><script>(${script.toString()})("")</script>`;
}

const zoom: NodeHandler = async ([, attrs, ...children], state) => {
  const extra = [
    attrs.id !== undefined && ` id="${attr(attrs.id)}"`,
    ' data-zoom tabindex="0"',
    attrs.group !== undefined && ` data-zoom-group="${attr(attrs.group)}"`,
    attrs.title !== undefined && ` data-zoom-title="${attr(attrs.title)}"`,
  ]
    .filter(Boolean)
    .join("");
  const className = attrs.class ? `cz ${attr(attrs.class)}` : "cz";
  return `<div class="${className}"${extra}>${await state.flow(["div", {}, ...children], state)}</div>${runtime(state)}`;
};

/** HTML renderers for `::zoom` and the script the plugin adds. Pass them as `components`. */
export const components: Record<"zoom" | typeof RUNTIME_TAG, NodeHandler> = {
  zoom,
  [RUNTIME_TAG]: (_node, state) => runtime(state),
};
