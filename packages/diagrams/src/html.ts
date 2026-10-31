import type { NodeHandler } from "comark";
import { css } from "./styles.ts";
import { rawText } from "../../../shared/text.ts";
import { attr } from "../../../shared/html.ts";

export { default, LANGUAGES, sanitizeSvg } from "./index.ts";
export type { DiagramAttributes, DiagramsMeta, DiagramsOptions } from "./index.ts";

// Each render gets a fresh `state.context`, so a document carries the styles once.
const styled = new WeakSet<object>();

const diagram: NodeHandler = ([, attrs], state) => {
  const { type, svg, label } = attrs;
  if (!svg) return "";
  const styles = styled.has(state.context) ? "" : `<style data-comark-diagrams>${css}</style>`;
  styled.add(state.context);
  // The plugin sanitized the SVG when it drew it.
  return (
    `${styles}<figure class="cdg" data-type="${attr(type)}"><div class="cdg-svg"${label ? ` role="img" aria-label="${attr(label)}"` : ""}>${rawText(svg)}</div>` +
    `${label ? `<figcaption>${attr(label)}</figcaption>` : ""}</figure>`
  );
};

/** The HTML renderer for diagrams. Pass it as `components`; it inlines the styles once per document. */
export const components: Record<"diagram", NodeHandler> = { diagram };
