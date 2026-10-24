import type { NodeHandler } from "comark";
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
  return `${styles}<dl class="cfm">${rows}</dl>`;
};

/** The HTML renderer for the properties box. Pass it as `components`; it inlines the styles once per document. */
export const components: Record<"properties", NodeHandler> = { properties };
