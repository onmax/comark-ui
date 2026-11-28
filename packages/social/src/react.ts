import { createElement, type ReactNode, useEffect } from "react";
import { addStyles } from "./client.ts";
import type { PostAttributes, ThreadAttributes } from "./index.ts";

export { default } from "./index.ts";
export type { PostAttributes, SocialMeta, SocialOptions, ThreadAttributes } from "./index.ts";

const flag = (value: string | undefined) => (value === undefined ? undefined : "");

/** `::post` for `@comark/react`. */
export function Post({
  platform,
  label,
  quote,
  thread,
  focal,
  rail,
  children,
}: PostAttributes & { children?: ReactNode }) {
  useEffect(addStyles, []);
  const outer = quote === undefined && thread === undefined;
  return createElement(
    "article",
    {
      className: "csl",
      "data-platform": platform || "generic",
      "data-quote": flag(quote),
      "data-thread": flag(thread),
      "data-focal": flag(focal),
      "data-rail": flag(rail),
      "data-comark-frame": outer ? "" : undefined,
      "data-not-typeset": outer ? "" : undefined,
      "aria-label": label || undefined,
    },
    children,
  );
}

/** `::thread` for `@comark/react`. */
export function Thread({ platform, label, children }: ThreadAttributes & { children?: ReactNode }) {
  useEffect(addStyles, []);
  return createElement(
    "div",
    {
      className: "csl-thread",
      role: "group",
      "data-platform": platform || "generic",
      "data-comark-frame": "",
      "data-not-typeset": "",
      "aria-label": label || undefined,
    },
    children,
  );
}

/** Pass these as `components` to `@comark/react`. */
export const components = { Post, Thread };
