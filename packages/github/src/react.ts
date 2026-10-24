import { createElement, type ReactNode, useEffect } from "react";
import { addStyles } from "./client.ts";
import { icon, typeOf } from "./icons.ts";

export { CALLOUT_TAG, callouts, html, references } from "./index.ts";
export type { CalloutsOptions, CalloutType, GitHubMeta, ReferencesOptions } from "./index.ts";

/** A callout for `@comark/react`. */
export function GithubCallout(props: { type?: string; title?: string; children?: ReactNode }) {
  useEffect(addStyles, []);
  const type = typeOf(props.type);
  return createElement(
    "div",
    { className: "cgc", "data-type": type },
    createElement("span", {
      className: "cgc-icon",
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: icon(type) },
    }),
    createElement("p", { className: "cgc-title" }, props.title),
    createElement("div", { className: "cgc-body" }, props.children),
  );
}

/** Pass these as `components` to `@comark/react`. */
export const components = { GithubCallout };
