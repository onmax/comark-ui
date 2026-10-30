import { createElement, useEffect } from "react";
import { controls, css, start } from "./client.ts";
import type { MediaAttributes } from "./index.ts";

export { default } from "./index.ts";
export type { MediaAttributes, MediaMeta, MediaOptions } from "./index.ts";

/** Videos and audio for `@comark/react`. */
export function Media({
  kind,
  src,
  label,
  poster,
  width,
  height,
  autoplay,
  loop,
  muted,
  native,
}: MediaAttributes) {
  const valid = (kind === "video" || kind === "audio") && Boolean(src);
  useEffect(() => (valid && !native ? start(css) : undefined), [valid, native]);
  if (!valid) return null;
  const video = kind === "video";
  const element = createElement(
    kind,
    {
      className: native ? "cm" : undefined,
      src,
      controls: true,
      playsInline: video || undefined,
      preload: "metadata",
      poster: video ? poster : undefined,
      width: video ? width : undefined,
      height: video ? height : undefined,
      autoPlay: autoplay || undefined,
      loop: loop || undefined,
      muted: muted || undefined,
      "aria-label": label || undefined,
    },
    createElement("a", { href: src }, label || src),
  );
  if (native) return element;
  return createElement(
    "span",
    {
      className: `cm cm-${kind}`,
      role: label ? "group" : undefined,
      "aria-label": label || undefined,
    },
    element,
    // The script updates the controls in place, so React doesn't own them.
    createElement("span", {
      className: "cm-bar",
      dangerouslySetInnerHTML: { __html: controls(kind) },
    }),
  );
}

/** Pass these as `components` to `@comark/react`. */
export const components = { Media };
