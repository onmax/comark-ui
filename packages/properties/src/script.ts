import type { describeTime, relativize } from "comark-time/client";

export function start(refreshDates: typeof relativize, describe: typeof describeTime) {
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
