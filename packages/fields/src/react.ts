import { createElement, type ReactNode, useEffect } from "react";
import { addStyles } from "./client.ts";

export { default } from "./index.ts";
export type { FieldAttributes, FieldsMeta } from "./index.ts";

type FieldProps = {
  name?: string;
  type?: string;
  required?: string | boolean;
  default?: string;
  children?: ReactNode;
};

/** `::field` for `@comark/react`. */
export function Field({ name, type, required, default: fallback, children }: FieldProps) {
  useEffect(addStyles, []);
  return createElement(
    "div",
    { className: "cfl" },
    createElement(
      "div",
      { className: "cfl-head" },
      name ? createElement("code", { className: "cfl-name" }, name) : null,
      type ? createElement("span", { className: "cfl-type" }, type) : null,
      required ? createElement("span", { className: "cfl-required" }, "required") : null,
      fallback
        ? createElement(
            "span",
            { className: "cfl-default" },
            "Default: ",
            createElement("code", null, fallback),
          )
        : null,
    ),
    createElement("div", { className: "cfl-body" }, children),
  );
}

/** `::field-group` for `@comark/react`. */
export function FieldGroup({ children }: { children?: ReactNode }) {
  useEffect(addStyles, []);
  return createElement("div", { className: "cfl-group" }, children);
}

/** Pass these as `components` to `@comark/react`. */
export const components = { Field, FieldGroup };
