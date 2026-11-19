import { inlineScript } from "../../../shared/html.ts";
import type { NodeHandler } from "comark";
import { describeTime, relativize } from "comark-time/client";
import { scripts as timeScripts, timeRuntime } from "comark-time/html";
import { css } from "./styles.ts";

export { default } from "./index.ts";
export type { PropertiesMeta, PropertiesOptions } from "./index.ts";

function start(refreshDates: typeof relativize, describe: typeof describeTime) {
  const runtime = Symbol.for("comark-properties/dates");
  if (Reflect.has(document, runtime)) return;
  Reflect.set(document, runtime, true);
  const selector = "dl[data-comark-properties-dates]";
  const started = new WeakSet<Element>();
  const refresh = (box: Element) => {
    if (!box.isConnected || started.has(box)) return;
    started.add(box);
    refreshDates(box, describe);
  };
  document.querySelectorAll(selector).forEach(refresh);
  new MutationObserver((records) => {
    for (const { addedNodes } of records) {
      for (const node of addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches(selector)) refresh(node);
        node.querySelectorAll(selector).forEach(refresh);
      }
    }
  }).observe(document, { childList: true, subtree: true });
}

// An inlined script can't import, so comark-time's `describeTime` goes in as source too.
const inline = inlineScript(
  `(${start.toString()})(${relativize.toString()},${describeTime.toString()})`,
);

/**
 * The inline scripts this renderer writes, each exactly as it goes in its `<script>`: the date refresh runtime, which
 * works even when a host moves scripts to the end of the page, and comark-time's, which lets Escape close a tooltip.
 * They're the same on every render, so a page with a strict Content Security Policy can allow them by hash or add its
 * nonce.
 */
export const scripts: string[] = [inline, ...timeScripts];

// Each render gets a fresh `state.context`, so a document carries the styles once.
const styled = new WeakSet<object>();
const scripted = new WeakSet<object>();

const properties: NodeHandler = async ([, , ...children], state) => {
  if (!children.length) return "";
  const styles = styled.has(state.context) ? "" : `<style data-comark-properties>${css}</style>`;
  styled.add(state.context);
  const rows = (await Promise.all(children.map((child) => state.one(child, state)))).join("");
  if (!rows.includes("<time")) return `${styles}<dl class="cfm" data-comark-frame>${rows}</dl>`;
  const script = scripted.has(state.context) ? "" : `<script>${inline}</script>`;
  scripted.add(state.context);
  return `${styles}${timeRuntime(state)}<dl class="cfm" data-comark-frame data-comark-properties-dates>${rows}</dl>${script}`;
};

/** The HTML renderer for the properties box. Pass it as `components`; it inlines the styles once per document. */
export const components: Record<"properties", NodeHandler> = { properties };
