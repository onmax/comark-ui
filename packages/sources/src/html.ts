import type { NodeHandler, State } from "comark";
import { start } from "./client.ts";
import { css } from "./styles.ts";
import { rawText } from "../../../shared/text.ts";
import { attr } from "../../../shared/html.ts";

export { default } from "./index.ts";
export type { SourcesAttributes, SourcesMeta } from "./index.ts";

const inline = `(${start.toString()})("")`;

/**
 * The inline scripts this renderer writes, each exactly as it goes in its `<script>`. They're the same on every
 * render, so a page with a strict Content Security Policy can allow them by hash or add its nonce.
 */
export const scripts: string[] = [inline];

// Each render gets a fresh `state.context`, so a document carries the styles and the script once.
const started = new WeakSet<object>();

/** The styles and the citation card's script, once per render. */
function runtime(state: State) {
  if (started.has(state.context)) return "";
  started.add(state.context);
  // The styles come inline before the script, so the script has nothing to add.
  return `<style data-comark-sources>${css}</style><script>${inline}</script>`;
}

const sources: NodeHandler = async ([, attrs, ...children], state) => {
  if (!children.length) return "";
  const title = rawText(attrs.title) || "Sources";
  const list = (await Promise.all(children.map((child) => state.one(child, state)))).join("");
  return `<section class="cso" aria-label="${attr(title)}"><p class="cso-title">${attr(title)}</p>${list}</section>${runtime(state)}`;
};

/** The HTML renderer for `::sources`. Pass it as `components`; it inlines the styles and the script once per document. */
export const components: Record<"sources", NodeHandler> = { sources };
