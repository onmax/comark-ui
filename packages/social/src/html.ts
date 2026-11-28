import type { NodeHandler } from "comark";
import { css } from "./styles.ts";
import { attr } from "../../../shared/html.ts";
import { rawText } from "../../../shared/text.ts";

export { default } from "./index.ts";
export type { PostAttributes, SocialMeta, SocialOptions } from "./index.ts";

// Each render gets a fresh `state.context`, so a document carries the styles once.
const styled = new WeakSet<object>();

const styles = ({ context }: Parameters<NodeHandler>[1]) => {
  if (styled.has(context)) return "";
  styled.add(context);
  return `<style data-comark-social>${css}</style>`;
};

// Comark's HTML renderer writes `aria-hidden="true"` as a bare `aria-hidden`, which screen readers ignore, so the
// visible count and the initial would be read twice.
const hidden = (html: string) =>
  html.replace(/(<span(?: class="csl-avatar")?) aria-hidden>/g, '$1 aria-hidden="true">');

// A quoted post sits inside its post's frame, so only the outer card is a frame a host may leave out of its own.
const post: NodeHandler = async (node, state) => {
  const [, attrs] = node;
  const quote = attrs.quote !== undefined;
  const label = rawText(attrs.label);
  return `${styles(state)}<article class="csl" data-platform="${attr(rawText(attrs.platform) || "generic")}"${quote ? " data-quote" : " data-comark-frame data-not-typeset"}${label ? ` aria-label="${attr(label)}"` : ""}>${hidden(await state.flow(node, state))}</article>`;
};

/** The HTML renderer for `::post`. Pass it as `components`; it inlines the styles once per document. */
export const components: Record<"post", NodeHandler> = { post };
