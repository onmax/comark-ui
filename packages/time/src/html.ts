import type { NodeHandler, State } from "comark";
import { start } from "./client.ts";
import { css } from "./styles.ts";
import { attr, inlineScript } from "../../../shared/html.ts";

export { default, describeTime, TIME_TAG } from "./index.ts";
export type {
  DescribeTimeOptions,
  TimeAttributes,
  TimeDescription,
  TimeMeta,
  TimeOptions,
} from "./index.ts";

const inline = inlineScript(`(${start.toString()})("")`);

/**
 * The inline scripts this renderer writes, each exactly as it goes in its `<script>`: the one that lets Escape close a
 * tooltip. It's the same on every render, so a page with a strict Content Security Policy can allow it by hash or add
 * its nonce.
 */
export const scripts: string[] = [inline];

// Each render gets a fresh `state.context`, so a document carries the styles and the script once.
const started = new WeakSet<object>();

/**
 * The time styles and the script that lets Escape close a tooltip, the first time a render asks and an empty string
 * after. Another plugin that writes comark-time's markup, such as comark-properties, writes it before that markup, so a
 * document that has both carries them once.
 */
export const timeRuntime = ({ context }: State): string => {
  if (started.has(context)) return "";
  started.add(context);
  // The styles come inline before the script, so the script has nothing to add.
  return `<style data-comark-time>${css}</style><script>${inline}</script>`;
};

const time: NodeHandler = ([, attrs], state) => {
  const { id, datetime, mode, label, tip } = attrs;
  if (!datetime || !label) return "";
  return (
    `${timeRuntime(state)}<time class="ctm" datetime="${attr(datetime)}" data-mode="${attr(mode)}" tabindex="0" aria-describedby="${attr(id)}">` +
    `${attr(label)}<span class="ctm-tip" role="tooltip" id="${attr(id)}"><span class="ctm-pill">${attr(tip)}</span></span></time>`
  );
};

/** The HTML renderer for `:time`. Pass it as `components`; it inlines the styles and the script once per document. */
export const components: Record<"relative-time", NodeHandler> = { "relative-time": time };
