import { inlineScript } from "../../../shared/html.ts";
import type { NodeHandler } from "comark";
import { localizeDates } from "./client.ts";
import { css } from "./styles.ts";

export { default } from "./index.ts";
export type { PropertiesMeta, PropertiesOptions } from "./index.ts";

const inline = inlineScript(
  `(${localizeDates.toString()})(document.currentScript.previousElementSibling)`,
);

/**
 * The inline scripts this renderer writes, each exactly as it goes in its `<script>`: the one after every box with a
 * date. It's the same on every render, so a page with a strict Content Security Policy can allow it by hash or add its
 * nonce.
 */
export const scripts: string[] = [inline];

// Each render gets a fresh `state.context`, so a document carries the styles once.
const styled = new WeakSet<object>();

const properties: NodeHandler = async ([, , ...children], state) => {
  if (!children.length) return "";
  const styles = styled.has(state.context) ? "" : `<style data-comark-properties>${css}</style>`;
  styled.add(state.context);
  const rows = (await Promise.all(children.map((child) => state.one(child, state)))).join("");
  // The script runs as the parser reaches it, so it follows the box and finds the dates already there.
  const dates = rows.includes("<time") ? `<script>${inline}</script>` : "";
  return `${styles}<dl class="cfm" data-comark-frame>${rows}</dl>${dates}`;
};

/** The HTML renderer for the properties box. Pass it as `components`; it inlines the styles once per document. */
export const components: Record<"properties", NodeHandler> = { properties };
