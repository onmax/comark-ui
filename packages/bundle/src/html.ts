import type { NodeHandler } from "comark";
import { css } from "./styles.ts";
import { attr } from "../../../shared/html.ts";
import { rawText } from "../../../shared/text.ts";

export { default } from "./index.ts";
export type {
  BundleAttributes,
  BundleLister,
  BundleMeta,
  BundleOptions,
  BundleReader,
} from "./index.ts";

// Each render gets a fresh `state.context`, so a document carries the styles once.
const styled = new WeakSet<object>();

const bundle: NodeHandler = async (node, state) => {
  const styles = styled.has(state.context) ? "" : `<style data-comark-bundle>${css}</style>`;
  styled.add(state.context);
  const label = rawText(node[1].label);
  return `${styles}<figure class="cbr" data-comark-frame data-not-typeset${label ? ` aria-label="${attr(label)}"` : ""}>${await state.flow(node, state)}</figure>`;
};

/** The HTML renderer for `::bundle`. Pass it as `components`; it inlines the styles once per document. */
export const components: Record<"bundle", NodeHandler> = { bundle };
