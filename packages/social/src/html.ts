import type { NodeHandler } from "comark";
import { css } from "./styles.ts";
import { attr } from "../../../shared/html.ts";
import { rawText } from "../../../shared/text.ts";

export { default } from "./index.ts";
export type {
  ConversationAttributes,
  PostAttributes,
  SocialMeta,
  SocialOptions,
  ThreadAttributes,
} from "./index.ts";

// Each render gets a fresh `state.context`, so a document carries the styles once.
const styled = new WeakSet<object>();

const styles = ({ context }: Parameters<NodeHandler>[1]) => {
  if (styled.has(context)) return "";
  styled.add(context);
  return `<style data-comark-social>${css}</style>`;
};

// Comark's HTML renderer writes `aria-hidden="true"` as a bare `aria-hidden`, which screen readers ignore, so the
// visible count, the initial, and a message's sender would be read twice.
const hidden = (html: string) =>
  html.replace(/(<span(?: class="csl-[a-z]+")?) aria-hidden>/g, '$1 aria-hidden="true">');

const flag = (attrs: Record<string, unknown>, name: string) =>
  attrs[name] !== undefined ? ` data-${name}` : "";

// A quoted post sits inside its post's frame, and a thread's posts inside the thread's, so only the outer card is a
// frame a host may leave out of its own.
const post: NodeHandler = async (node, state) => {
  const [, attrs] = node;
  const inner = attrs.quote !== undefined || attrs.thread !== undefined;
  const label = rawText(attrs.label);
  const marks = ["quote", "thread", "focal", "rail"].map((name) => flag(attrs, name)).join("");
  return `${styles(state)}<article class="csl" data-platform="${attr(rawText(attrs.platform) || "generic")}"${marks}${inner ? "" : " data-comark-frame data-not-typeset"}${label ? ` aria-label="${attr(label)}"` : ""}>${hidden(await state.flow(node, state))}</article>`;
};

const thread: NodeHandler = async (node, state) => {
  const [, attrs] = node;
  const label = rawText(attrs.label);
  return `${styles(state)}<div class="csl-thread" role="group" data-platform="${attr(rawText(attrs.platform) || "generic")}" data-comark-frame data-not-typeset${label ? ` aria-label="${attr(label)}"` : ""}>${await state.flow(node, state)}</div>`;
};

const conversation: NodeHandler = async (node, state) => {
  const [, attrs] = node;
  const label = rawText(attrs.label);
  return `${styles(state)}<div class="csl-chat" role="group" data-platform="${attr(rawText(attrs.platform) || "generic")}"${attrs.request !== undefined ? " data-request" : ""} data-comark-frame data-not-typeset${label ? ` aria-label="${attr(label)}"` : ""}>${hidden(await state.flow(node, state))}</div>`;
};

/** The HTML renderer for `::post`, `::thread`, and `::conversation`. Pass it as `components`; it inlines the styles once per document. */
export const components: Record<"post" | "thread" | "conversation", NodeHandler> = {
  post,
  thread,
  conversation,
};
