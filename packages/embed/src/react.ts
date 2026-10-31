import { createElement, useEffect } from "react";
import { addStyles, allow, icons, referrerPolicy, start } from "./client.ts";
import type { EmbedAttributes } from "./index.ts";

export { default } from "./index.ts";
export type { EmbedAttributes, EmbedMeta, Size } from "./index.ts";

const icon = (d: string) =>
  createElement(
    "svg",
    {
      viewBox: "0 0 24 24",
      width: 16,
      height: 16,
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": true,
    },
    createElement("path", { d }),
  );

/** `::embed` for `@comark/react`. */
export function Embed({ provider, src, label, size, href, title, host }: EmbedAttributes) {
  useEffect(() => {
    addStyles();
    return provider === "x" ? start() : undefined;
  }, [provider]);
  if (!href) return null;
  if (!src)
    return createElement(
      "a",
      { className: "ce-card", href },
      icon(icons.globe),
      createElement("strong", null, title),
      " ",
      createElement("span", null, host),
    );
  return createElement(
    "figure",
    { className: "ce", "data-provider": provider, "data-size": size },
    createElement(
      "div",
      { className: "ce-frame" },
      createElement("iframe", {
        key: src,
        src,
        title: label,
        loading: "lazy",
        allow,
        allowFullScreen: true,
        referrerPolicy,
      }),
    ),
    createElement("figcaption", null, createElement("a", { href }, title, icon(icons.external))),
  );
}

/** Pass these as `components` to `@comark/react`. */
export const components = { Embed };
