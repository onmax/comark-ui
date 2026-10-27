import type { NodeHandler, State } from "comark";
import { escapeHtml } from "comark/utils";
import { RAIL_TAG } from "./index.ts";
import { start } from "./script.ts";
import { css } from "./styles.ts";

export { default, RAIL_TAG } from "./index.ts";
export type {
  OutlineMeta,
  OutlineOptions,
  RailAttributes,
  RailOptions,
  TocAttributes,
} from "./index.ts";

/**
 * The side outline's script, exactly as the HTML renderer inlines it in a `<script>`, so a page with a strict
 * Content-Security-Policy can hash it.
 */
export const railScript = `(${start.toString()})()`;

// Each render gets a fresh `state.context`, so a document carries the styles and the script once.
const styled = new WeakSet<object>();
const started = new WeakSet<object>();

const attr = (value: string) => escapeHtml(value, { '"': "&quot;" });
// SAFETY: the parse plugin writes every attribute the renderer reads as a string.
const str = (value: unknown) => (value === undefined ? "" : String(value as string));

function styles(state: State) {
  if (styled.has(state.context)) return "";
  styled.add(state.context);
  return `<style data-comark-outline>${css}</style>`;
}

const toc: NodeHandler = async ([, attrs, ...children], state) => {
  if (!children.length) return "";
  const title = str(attrs.title);
  const list = (await Promise.all(children.map((child) => state.one(child, state)))).join("");
  return `${styles(state)}<nav class="cto" aria-label="${attr(title || "Contents")}">${title ? `<p class="cto-title">${attr(title)}</p>` : ""}${list}</nav>`;
};

const rail: NodeHandler = async ([, attrs, ...children], state) => {
  const title = attr(str(attrs.title));
  const list = (await Promise.all(children.map((child) => state.one(child, state)))).join("");
  const script = started.has(state.context) ? "" : `<script>${railScript}</script>`;
  started.add(state.context);
  return `${styles(state)}<nav class="cto cto-rail" aria-label="${title}"><p class="cto-title">${title}</p>${list}</nav>${script}`;
};

/**
 * The HTML renderers for `::toc` and the side outline. Pass them as `components`; they inline the styles, and the side
 * outline's script, once per document.
 */
export const components: Record<"toc" | typeof RAIL_TAG, NodeHandler> = {
  toc,
  [RAIL_TAG]: rail,
};
