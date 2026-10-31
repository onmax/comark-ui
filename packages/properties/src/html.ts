import type { NodeHandler } from "comark";
import { localizeDates } from "./client.ts";
import { css } from "./styles.ts";

export { default } from "./index.ts";
export type { PropertiesMeta, PropertiesOptions } from "./index.ts";

// Each render gets a fresh `state.context`, so a document carries the styles once.
const styled = new WeakSet<object>();

const properties: NodeHandler = async ([, , ...children], state) => {
  if (!children.length) return "";
  const styles = styled.has(state.context) ? "" : `<style data-comark-properties>${css}</style>`;
  styled.add(state.context);
  const rows = (await Promise.all(children.map((child) => state.one(child, state)))).join("");
  // The script runs as the parser reaches it, so it follows the box and finds the dates already there.
  const dates = rows.includes("<time")
    ? `<script>(${localizeDates.toString()})(document.currentScript.previousElementSibling)</script>`
    : "";
  return `${styles}<dl class="cfm">${rows}</dl>${dates}`;
};

/** The HTML renderer for the properties box. Pass it as `components`; it inlines the styles once per document. */
export const components: Record<"properties", NodeHandler> = { properties };
