import type { NodeHandler } from "comark";
import { controls, start } from "./client.ts";
import { css } from "./styles.ts";
import { attr, inlineScript } from "../../../shared/html.ts";

export { default } from "./index.ts";
export type { MediaAttributes, MediaMeta, MediaOptions } from "./index.ts";

const inline = inlineScript(`(${start.toString()})("")`);

/**
 * The inline scripts this renderer writes, each exactly as it goes in its `<script>`. They're the same on every
 * render, so a page with a strict Content Security Policy can allow them by hash or add its nonce.
 */
export const scripts: string[] = [inline];

// Each render gets a fresh `state.context`, so a document carries the styles and the script once.
const styled = new WeakSet<object>();
const started = new WeakSet<object>();

const media: NodeHandler = ([, attrs], state) => {
  const { kind, src, label, poster, width, height, autoplay, loop, muted, native } = attrs;
  if ((kind !== "video" && kind !== "audio") || !src) return "";
  const styles = styled.has(state.context) ? "" : `<style data-comark-media>${css}</style>`;
  styled.add(state.context);
  const video = kind === "video";
  const element =
    `<${kind}${native ? ` class="cm"${video ? " data-comark-frame" : ""}` : ""} src="${attr(src)}" controls${video ? " playsinline" : ""} preload="metadata"` +
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
  const script = started.has(state.context) ? "" : `<script>${inline}</script>`;
  started.add(state.context);
  return `${styles}<span class="cm cm-${kind}"${video ? " data-comark-frame" : ""}${label ? ` role="group" aria-label="${attr(label)}"` : ""}>${element}<span class="cm-bar">${controls(kind)}</span></span>${script}`;
};

/** The HTML renderer for videos and audio. Pass it as `components`; it inlines the styles and the players' script once per document. */
export const components: Record<"media", NodeHandler> = { media };
