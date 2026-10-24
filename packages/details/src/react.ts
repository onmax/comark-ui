import { Icon, type IconData } from "comark-icon/react";
import { createElement, type ReactNode, useEffect } from "react";
import { addStyles } from "./client.ts";

export { default } from "./index.ts";
export type {
  DetailsMeta,
  DetailsOptions,
  DisclosureAttributes,
  DisclosureSummaryAttributes,
} from "./index.ts";

/** `::accordion` for `@comark/react`. */
export function Accordion({ children }: { children?: ReactNode }) {
  useEffect(addStyles, []);
  return createElement("div", { className: "cdt-accordion" }, children);
}

type DisclosureProps = {
  variant?: string;
  name?: string;
  open?: string | boolean;
  children?: ReactNode;
};

/** `::details`, each `:::accordion-item`, and `::collapsible` for `@comark/react`. */
export function Disclosure({ variant, name, open, children }: DisclosureProps) {
  useEffect(addStyles, []);
  return createElement(
    "details",
    { className: "cdt", "data-variant": variant, name: name || undefined, open: Boolean(open) },
    children,
  );
}

type SummaryProps = { icon?: IconData; show?: string; hide?: string; children?: ReactNode };

/** The summary of a disclosure for `@comark/react`. */
export function DisclosureSummary({ icon, show, hide, children }: SummaryProps) {
  return createElement(
    "summary",
    { className: "cdt-summary" },
    icon?.src ? createElement(Icon, icon) : null,
    createElement(
      "span",
      null,
      show
        ? createElement("span", {
            className: "cdt-toggle",
            "data-show": `${show} `,
            "data-hide": `${hide} `,
          })
        : null,
      children,
    ),
  );
}

/** Pass these as `components` to `@comark/react`. */
export const components = { Accordion, Disclosure, DisclosureSummary };
