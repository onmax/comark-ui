import { createElement, type ReactNode, useEffect } from "react";
import { addStyles, counterReset } from "./client.ts";

export { default } from "./index.ts";
export type { StepAttributes, StepsAttributes, StepsMeta } from "./index.ts";

/** `::steps` for `@comark/react`. */
export function Steps({ start, children }: { start?: string | number; children?: ReactNode }) {
  useEffect(addStyles, []);
  const reset = counterReset(start);
  return createElement(
    "ol",
    {
      className: "cs",
      start: reset ? Number(start) : undefined,
      style: reset ? { counterReset: reset } : undefined,
    },
    children,
  );
}

/** Each step of a `::steps` for `@comark/react`. */
export function Step({ children }: { index?: string | number; children?: ReactNode }) {
  return createElement("li", { className: "cs-step" }, children);
}

/** Pass these as `components` to `@comark/react`. */
export const components = { Steps, Step };
