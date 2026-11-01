// The plugins an example renders with, shared by docs/build.ts and the component gallery's editor, so an example
// edited in the browser renders as its page does.
import shiki from "@comark/html/plugins/shiki";
import type { IconOptions } from "comark-icon";
import dark from "shiki/themes/github-dark-default.mjs";
import light from "shiki/themes/github-light-high-contrast.mjs";
import { browserPlugins } from "./plugins.ts";

// `#123` on the site links to this repository's issues. The site styles its own text in style.css, so its pages leave
// typeset off; the playground keeps it, to show what a document gets.
export const sitePlugins = (
  typeset = false,
  { download = true, icon }: { download?: boolean; icon?: IconOptions } = {},
) =>
  browserPlugins(
    { "comark-github": { references: { repo: "onmax/comark-ui" } } },
    { download, icon, typeset },
  );

// Shiki goes before comark-code, which marks the lines Shiki drew. Keep this tied to the plugin name so adding a
// renderer-only plugin after code doesn't change the ordering required by code's line-marker validation.
export const highlighted = <Plugin extends { name?: string }>(list: Plugin[]) => {
  const code = list.findIndex((plugin) => plugin.name === "comark-code");
  if (code < 0) return list;
  return [...list.slice(0, code), shiki({ themes: { light, dark } }), ...list.slice(code)];
};

// comark-chips would take the `@user` that comark-github's references draw, and the links comark-links marks, so
// those packages' examples show plain links.
export const withoutFor = (slug = "") =>
  ["github", "links"].includes(slug) ? ["comark-chips"] : [];
