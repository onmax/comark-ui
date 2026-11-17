import { inlineScript } from "../../../shared/html.ts";
import type { NodeHandler } from "comark";
import { describeTime, relativize } from "comark-time/client";
import { scripts as timeScripts, timeRuntime } from "comark-time/html";
import { css } from "./styles.ts";

export { default } from "./index.ts";
export type { PropertiesMeta, PropertiesOptions } from "./index.ts";

// An inlined script can't import, so comark-time's `describeTime` goes in as source too.
const inline = inlineScript(
  `(${relativize.toString()})(document.currentScript.previousElementSibling,${describeTime.toString()})`,
);

/**
 * The inline scripts this renderer writes, each exactly as it goes in its `<script>`: the one after every box with a
 * date, which writes its dates relative to the reader's clock, and comark-time's, which lets Escape close a tooltip.
 * They're the same on every render, so a page with a strict Content Security Policy can allow them by hash or add its
 * nonce.
 */
export const scripts: string[] = [inline, ...timeScripts];

// Each render gets a fresh `state.context`, so a document carries the styles once.
const styled = new WeakSet<object>();

const properties: NodeHandler = async ([, , ...children], state) => {
  if (!children.length) return "";
  const styles = styled.has(state.context) ? "" : `<style data-comark-properties>${css}</style>`;
  styled.add(state.context);
  const rows = (await Promise.all(children.map((child) => state.one(child, state)))).join("");
  if (!rows.includes("<time")) return `${styles}<dl class="cfm" data-comark-frame>${rows}</dl>`;
  // The script runs as the parser reaches it, so it follows the box, finds the dates already there, and rewrites them
  // before the page first paints.
  return `${styles}${timeRuntime(state)}<dl class="cfm" data-comark-frame>${rows}</dl><script>${inline}</script>`;
};

/** The HTML renderer for the properties box. Pass it as `components`; it inlines the styles once per document. */
export const components: Record<"properties", NodeHandler> = { properties };
