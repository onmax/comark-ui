import { createElement, type ReactNode, useEffect } from "react";
import { addStyles } from "./client.ts";
import type { ConversationAttributes, PostAttributes } from "./index.ts";

export { default } from "./index.ts";
export type { ConversationAttributes, PostAttributes, SocialMeta, SocialOptions } from "./index.ts";

/** `::post` for `@comark/react`. */
export function Post({
  platform,
  label,
  quote,
  children,
}: PostAttributes & { children?: ReactNode }) {
  useEffect(addStyles, []);
  const outer = quote === undefined;
  return createElement(
    "article",
    {
      className: "csl",
      "data-platform": platform || "generic",
      "data-quote": outer ? undefined : "",
      "data-comark-frame": outer ? "" : undefined,
      "data-not-typeset": outer ? "" : undefined,
      "aria-label": label || undefined,
    },
    children,
  );
}

/** `::conversation` for `@comark/react`. */
export function Conversation({
  platform,
  label,
  request,
  children,
}: ConversationAttributes & { children?: ReactNode }) {
  useEffect(addStyles, []);
  return createElement(
    "div",
    {
      className: "csl-chat",
      role: "group",
      "data-platform": platform || "generic",
      "data-request": request === undefined ? undefined : "",
      "data-comark-frame": "",
      "data-not-typeset": "",
      "aria-label": label || undefined,
    },
    children,
  );
}

/** Pass these as `components` to `@comark/react`. */
export const components = { Post, Conversation };
