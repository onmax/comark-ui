import type { Node, NodeHandler } from "comark";
import { escapeHtml } from "comark/utils";
import { classOf } from "./client.ts";
import { css } from "./styles.ts";
import { isElement } from "../../../shared/nodes.ts";
import { rawText } from "../../../shared/text.ts";

export { default, KATEX_TAGS, MATHML_TAGS } from "./index.ts";
export type { FormulaAttributes, MathMeta, MathOptions, MathOutput } from "./index.ts";

/**
 * A formula's MathML as markup, with no whitespace added: Comark's renderer indents elements it doesn't know, which
 * would pad each `<mi>` and the TeX that copying reads.
 */
const markup = (nodes: Node[]): string =>
  nodes
    .map((node) => {
      if (!Array.isArray(node)) return escapeHtml(node);
      if (!isElement(node)) return "";
      const [tag, attrs, ...children] = node;
      const attributes = Object.entries(attrs)
        .filter(([name, value]) => name !== "$" && value !== undefined && value !== null)
        .map(([name, value]) => ` ${name}="${escapeHtml(String(value))}"`)
        .join("");
      return `<${tag}${attributes}>${markup(children)}</${tag}>`;
    })
    .join("");

// Each render gets a fresh `state.context`, so a document carries the styles once.
const styled = new WeakSet<object>();

const formula: NodeHandler = ([, attrs, ...children], state) => {
  const styles = styled.has(state.context) ? "" : `<style data-comark-mathml>${css}</style>`;
  styled.add(state.context);
  const typeset = children.length > 0;
  const body = typeset ? markup(children) : escapeHtml(rawText(attrs.tex));
  return `${styles}<span class="${classOf(attrs.display === true, typeset)}">${body}</span>`;
};

/** The HTML renderer for math. Pass it as `components`; it inlines the styles once per document. */
export const components: Record<"formula", NodeHandler> = { formula };
