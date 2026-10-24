import type { NodeHandler } from "comark";
import { escapeHtml } from "comark/utils";
import { css } from "./styles.ts";

export { default, LANGUAGES, sanitizeSvg } from "./index.ts";
export type { DiagramAttributes, DiagramsMeta, DiagramsOptions } from "./index.ts";

// Each render gets a fresh `state.context`, so a document carries the styles once.
const styled = new WeakSet<object>();

const text = (value: unknown) =>
  value === undefined || value === null || value instanceof Object
    ? ""
    : // SAFETY: undefined, null, objects, and arrays returned above, so only a string, number, or boolean is left.
      String(value as string | number | boolean);
const attr = (value: unknown) => escapeHtml(text(value), { '"': "&quot;" });

const diagram: NodeHandler = ([, attrs], state) => {
  const { type, svg, label } = attrs;
  if (!svg) return "";
  const styles = styled.has(state.context) ? "" : `<style data-comark-diagrams>${css}</style>`;
  styled.add(state.context);
  // The plugin sanitized the SVG when it drew it.
  return (
    `${styles}<figure class="cdg" data-type="${attr(type)}"><div class="cdg-svg"${label ? ` role="img" aria-label="${attr(label)}"` : ""}>${text(svg)}</div>` +
    `${label ? `<figcaption>${attr(label)}</figcaption>` : ""}</figure>`
  );
};

/** The HTML renderer for diagrams. Pass it as `components`; it inlines the styles once per document. */
export const components: Record<"diagram", NodeHandler> = { diagram };
