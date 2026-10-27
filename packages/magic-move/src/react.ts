import { createElement, type ReactNode, useEffect } from "react";
import { css, start } from "./client.ts";

export { default } from "./index.ts";
export type { MagicMoveMeta } from "./index.ts";

const chevron = (d: string) =>
  createElement(
    "svg",
    {
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": true,
    },
    createElement("path", { d }),
  );
const button = (by: number, label: string, path: string, disabled?: boolean) =>
  createElement(
    "button",
    {
      type: "button",
      className: "cmv-button",
      "data-magic-move-step": String(by),
      "aria-label": label,
      "aria-disabled": disabled || undefined,
    },
    chevron(path),
  );

/** `::magic-move` for `@comark/react`. */
export function MagicMove({
  count,
  title,
  children,
}: {
  count?: string | number;
  title?: string;
  children?: ReactNode;
}) {
  useEffect(() => start(css), []);
  const total = Number(count) || 0;
  const controls =
    total > 1
      ? createElement(
          "div",
          { className: "cmv-controls" },
          createElement("span", { className: "cmv-count", "aria-live": "polite" }, `1 / ${total}`),
          createElement(
            "div",
            { className: "cmv-steps" },
            button(-1, "Previous step", "m15 18-6-6 6-6", true),
            button(1, "Next step", "m9 18 6-6-6-6"),
          ),
        )
      : null;
  return createElement(
    "div",
    {
      className: "cmv",
      role: "region",
      "aria-roledescription": "code steps",
      "aria-label": title ?? "Code steps",
    },
    createElement("div", { className: "cmv-stage" }, children),
    controls,
  );
}

/** Each step of a `::magic-move` for `@comark/react`. */
export function MagicMoveStep({
  index,
  count,
  label,
  children,
}: {
  index?: string | number;
  count?: string | number;
  label?: string;
  children?: ReactNode;
}) {
  return createElement(
    "div",
    {
      className: "cmv-step",
      role: "group",
      "aria-roledescription": "step",
      "aria-label": `${index} of ${count}`,
      "data-inactive": Number(index) > 1 ? "" : undefined,
    },
    label ? createElement("div", { className: "cmv-label" }, label) : null,
    children,
  );
}

/** Pass these as `components` to `@comark/react`. */
export const components = { MagicMove, MagicMoveStep };
