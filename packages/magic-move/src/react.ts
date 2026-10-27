import { createContext, createElement, type ReactNode, useContext, useEffect, useId } from "react";
import { css, start } from "./client.ts";

export { default } from "./index.ts";
export type { MagicMoveMeta } from "./index.ts";

const MagicMoveId = createContext("");

/** `::magic-move` for `@comark/react`. */
export function MagicMove({
  uid,
  labels,
  title,
  children,
}: {
  uid?: string;
  labels?: string[];
  title?: string;
  children?: ReactNode;
}) {
  const id = `${uid ?? "cmv"}-${useId()}`;
  useEffect(() => start(css), []);
  return createElement(
    MagicMoveId.Provider,
    { value: id },
    createElement(
      "div",
      { className: "cmv" },
      createElement(
        "div",
        { className: "cmv-list", role: "tablist", "aria-label": title || undefined },
        (labels ?? []).map((label, at) =>
          createElement(
            "button",
            {
              key: at,
              type: "button",
              className: "cmv-tab",
              role: "tab",
              id: `${id}-tab-${at + 1}`,
              "aria-controls": `${id}-panel-${at + 1}`,
              "aria-selected": at === 0,
              tabIndex: at === 0 ? 0 : -1,
            },
            String(label),
          ),
        ),
      ),
      createElement("div", { className: "cmv-stage" }, children),
    ),
  );
}

/** Each step of a `::magic-move` for `@comark/react`. */
export function MagicMoveStep({
  uid,
  index,
  label,
  children,
}: {
  uid?: string;
  index?: string | number;
  label?: string;
  children?: ReactNode;
}) {
  const id = useContext(MagicMoveId) || uid;
  return createElement(
    "div",
    {
      className: "cmv-step",
      role: "tabpanel",
      id: `${id}-panel-${index}`,
      "aria-labelledby": `${id}-tab-${index}`,
      tabIndex: 0,
      "data-inactive": Number(index) > 1 ? "" : undefined,
    },
    createElement("div", { className: "cmv-caption" }, label),
    children,
  );
}

/** Pass these as `components` to `@comark/react`. */
export const components = { MagicMove, MagicMoveStep };
