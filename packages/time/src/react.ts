import { createElement, useEffect } from "react";
import { css, start } from "./client.ts";
import type { TimeAttributes } from "./index.ts";

export { default, describeTime, TIME_TAG } from "./index.ts";
export type {
  DescribeTimeOptions,
  TimeAttributes,
  TimeDescription,
  TimeMeta,
  TimeOptions,
} from "./index.ts";

/** `:time` for `@comark/react`. */
export function RelativeTime({ id, datetime, mode, label, tip }: TimeAttributes) {
  useEffect(() => start(css), []);
  if (!datetime || !label) return null;
  return createElement(
    "time",
    {
      className: "ctm",
      dateTime: datetime,
      "data-mode": mode,
      tabIndex: 0,
      "aria-describedby": id,
    },
    label,
    createElement(
      "span",
      { className: "ctm-tip", role: "tooltip", id },
      createElement("span", { className: "ctm-pill" }, tip),
    ),
  );
}

/** Pass these as `components` to `@comark/react`. */
export const components = { RelativeTime };
