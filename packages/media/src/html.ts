import type { NodeHandler } from "comark";
import { escapeHtml } from "comark/utils";
import { controls, start } from "./client.ts";
import { css } from "./styles.ts";

export { default } from "./index.ts";
export type { MediaAttributes, MediaMeta, MediaOptions } from "./index.ts";

// Each render gets a fresh `state.context`, so a document carries the styles and the script once.
const styled = new WeakSet<object>();
const started = new WeakSet<object>();

const text = (value: unknown) =>
  value === undefined || value === null || value instanceof Object
    ? ""
    : // SAFETY: undefined, null, objects, and arrays returned above, so only a string, number, or boolean is left.
      String(value as string | number | boolean);
const attr = (value: unknown) => escapeHtml(text(value), { '"': "&quot;" });

const media: NodeHandler = ([, attrs], state) => {
  const { kind, src, label, poster, width, height, autoplay, loop, muted, native } = attrs;
  if ((kind !== "video" && kind !== "audio") || !src) return "";
  const styles = styled.has(state.context) ? "" : `<style data-comark-media>${css}</style>`;
  styled.add(state.context);
  const video = kind === "video";
  const element =
    `<${kind}${native ? ' class="cm"' : ""} src="${attr(src)}" controls${video ? " playsinline" : ""} preload="metadata"` +
    (poster && video ? ` poster="${attr(poster)}"` : "") +
    // The browser keeps this room, at the video's ratio, until the video loads.
    (width && height && video ? ` width="${attr(width)}" height="${attr(height)}"` : "") +
    (autoplay ? " autoplay" : "") +
    (loop ? " loop" : "") +
    (muted ? " muted" : "") +
    (label ? ` aria-label="${attr(label)}"` : "") +
    // Only a browser that can't play the file shows this.
    `><a href="${attr(src)}">${attr(label || src)}</a></${kind}>`;
  if (native) return styles + element;
  // The styles come inline before the script, so the script has nothing to add.
  const script = started.has(state.context) ? "" : `<script>(${start.toString()})("")</script>`;
  started.add(state.context);
  return `${styles}<span class="cm cm-${kind}"${label ? ` role="group" aria-label="${attr(label)}"` : ""}>${element}<span class="cm-bar">${controls(kind)}</span></span>${script}`;
};

/** The HTML renderer for videos and audio. Pass it as `components`; it inlines the styles and the players' script once per document. */
export const components: Record<"media", NodeHandler> = { media };
