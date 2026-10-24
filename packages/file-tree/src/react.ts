import { Icon, type IconData } from "comark-icon/react";
import { createElement, type ReactNode, useEffect } from "react";
import { addStyles, glyphs, marks } from "./client.ts";

export { default } from "./index.ts";
export type { EntryState, FileTreeItemAttributes, FileTreeMeta, FileTreeOptions } from "./index.ts";

const glyph = (d: string) =>
  createElement(
    "svg",
    {
      className: "cft-glyph",
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

/** `::file-tree` for `@comark/react`. */
export function FileTree({ children }: { children?: ReactNode }) {
  useEffect(addStyles, []);
  return createElement("div", { className: "cft" }, createElement("ul", null, children));
}

type FileTreeItemProps = {
  type?: string;
  name?: string;
  state?: string;
  note?: string;
  icon?: IconData;
  children?: ReactNode;
};

/** Each entry of a `::file-tree` for `@comark/react`. */
export function FileTreeItem({ type, name, state, note, icon, children }: FileTreeItemProps) {
  if (type === "more") return createElement("li", { "data-type": "more" }, "…");
  const folder = type === "folder";
  const mark = marks.get(String(state));
  const entry = createElement(
    "span",
    { className: "cft-entry" },
    icon?.src ? createElement(Icon, icon) : glyph(folder ? glyphs.folder : glyphs.file),
    mark ? createElement("span", { className: "cft-mark" }, mark) : null,
    createElement("span", { className: "cft-name" }, name),
    note ? createElement("span", { className: "cft-note" }, note) : null,
  );
  return createElement(
    "li",
    { "data-type": folder ? "folder" : "file", "data-state": mark ? state : undefined },
    folder
      ? createElement(
          "details",
          { open: true },
          createElement("summary", null, entry),
          createElement("ul", null, children),
        )
      : entry,
  );
}

/** Pass these as `components` to `@comark/react`. */
export const components = { FileTree, FileTreeItem };
