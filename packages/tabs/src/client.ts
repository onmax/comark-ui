import { createCodeMotion } from "../../../shared/code-motion.ts";

declare global {
  interface Window {
    __comarkTabs?: { users: number; stop: () => void; restore: () => void };
  }
}

/**
 * Starts every `.ct` tab strip on the page and returns a function that stops it. Every caller shares one set of
 * listeners, which stop with the last caller. The HTML renderer inlines it with the token mover,
 * so every other dependency must stay inside its body.
 */
export function start(css: string, createMotion = createCodeMotion): () => void {
  const running = window.__comarkTabs;
  if (running) {
    running.users++;
    running.restore();
    return running.stop;
  }
  const listeners = new AbortController();
  const signal = listeners.signal;
  // The page may already carry the styles: the HTML renderer inlines them, and apps can import style.css.
  const style = document.querySelector("style[data-comark-tabs],link[data-comark-tabs]")
    ? null
    : document.createElement("style");
  if (style) {
    style.setAttribute("data-comark-tabs", "");
    style.textContent = css;
    document.head.append(style);
  }
  document.documentElement.setAttribute("data-tabs-ready", "");

  // Only the block's own parts: a panel can hold tabs of its own.
  const tabsOf = (root: Element) => [
    ...root.querySelectorAll<HTMLElement>(":scope>.ct-list>[role=tab]"),
  ];
  const panelsOf = (root: Element) => [...root.querySelectorAll<HTMLElement>(":scope>.ct-panel")];
  const label = (tab: Element) => tab.textContent?.trim() ?? "";

  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const easing = "cubic-bezier(.22,1,.36,1)";
  // The new tab's surface starts where the old one is drawn, mid-slide if it was still moving, so fast switches retarget.
  function slide(from: HTMLElement, to: HTMLElement) {
    if (motion.matches) {
      to.animate({ opacity: [0, 1] }, { duration: 150, pseudoElement: "::before" });
      return;
    }
    const start = from.getBoundingClientRect();
    const end = to.getBoundingClientRect();
    if (!end.width) return;
    const drawn = new DOMMatrix(getComputedStyle(from, "::before").transform);
    for (const running of from.getAnimations({ subtree: true })) running.cancel();
    const left = start.left + drawn.m41;
    const width = start.width * drawn.m11;
    to.animate(
      {
        transform: [`translateX(${left - end.left}px) scaleX(${width / end.width})`, "none"],
      },
      { duration: 200, easing, pseudoElement: "::before" },
    );
  }

  const codeMotion = createMotion("ct", 280);

  function select(root: Element, index: number, animate = false, move = animate) {
    const tabs = tabsOf(root);
    const from = tabs.find((tab) => tab.getAttribute("aria-selected") === "true");
    const panels = panelsOf(root);
    const previous = panels.find((panel) => !panel.hasAttribute("data-inactive"));
    const target = panels[index];
    const magic = root.getAttribute("data-tabs-magic");
    if (
      root instanceof HTMLElement &&
      magic &&
      magic !== "never" &&
      previous &&
      target &&
      previous !== target
    )
      codeMotion.show(
        root,
        previous,
        target,
        // Snippets with little in common would scatter their pieces, so they swap as plain tabs do.
        move && (magic !== "auto" || codeMotion.likeness(previous, target) >= 0.5),
      );
    for (const [at, tab] of tabs.entries()) {
      tab.setAttribute("aria-selected", String(at === index));
      tab.tabIndex = at === index ? 0 : -1;
    }
    for (const [at, panel] of panels.entries())
      panel.toggleAttribute("data-inactive", at !== index);
    const to = tabs[index];
    if (animate && from && to && from !== to) slide(from, to);
  }
  const selectLabel = (root: Element, name: string, animate = false, move = animate) => {
    const index = tabsOf(root).findIndex((tab) => label(tab) === name);
    if (index >= 0) select(root, index, animate, move);
  };

  // Storage can throw, in a sandboxed frame or with cookies blocked; the tabs still switch without it.
  const key = (sync: string) => `comark-tabs:${sync}`;
  const current = new Map<string, string>();
  const read = (sync: string) => {
    const selected = current.get(sync);
    if (selected !== undefined) return selected;
    try {
      const saved = localStorage.getItem(key(sync));
      if (saved !== null) return saved;
    } catch {}
    return current.get(sync) ?? null;
  };
  const synced = (sync: string) =>
    document.querySelectorAll(`.ct[data-tabs-sync="${CSS.escape(sync)}"]`);

  const restore = (node: ParentNode = document) => {
    const roots = [...node.querySelectorAll(".ct[data-tabs-sync]")];
    if (node instanceof Element && node.matches(".ct[data-tabs-sync]")) roots.unshift(node);
    for (const root of roots) {
      const saved = read(root.getAttribute("data-tabs-sync") ?? "");
      if (saved !== null) selectLabel(root, saved);
    }
  };
  restore();
  // The HTML renderer inlines the script after the first tabs, so the page's later tabs arrive after it.
  const added = new MutationObserver((records) => {
    for (const record of records)
      for (const node of record.addedNodes) if (node instanceof Element) restore(node);
  });
  added.observe(document.documentElement, { childList: true, subtree: true });

  function activate(tab: HTMLElement, focus: boolean, animate = !focus) {
    const root = tab.parentElement?.parentElement;
    if (!root?.matches(".ct")) return;
    const sync = root.getAttribute("data-tabs-sync");
    if (sync) {
      // Switching tabs above the reader changes their height, so the page scrolls by as much to keep this tab still.
      const before = tab.getBoundingClientRect().top;
      for (const other of synced(sync)) selectLabel(other, label(tab), true, animate);
      select(root, tabsOf(root).indexOf(tab), true, animate);
      window.scrollBy({ top: tab.getBoundingClientRect().top - before, behavior: "instant" });
      const selected = label(tab);
      current.set(sync, selected);
      try {
        localStorage.setItem(key(sync), selected);
      } catch {}
    } else select(root, tabsOf(root).indexOf(tab), true, animate);
    if (focus) tab.focus();
  }

  const tabOf = (event: Event) =>
    event.target instanceof Element
      ? event.target.closest<HTMLElement>(".ct>.ct-list>[role=tab]")
      : null;

  document.addEventListener(
    "click",
    (event) => {
      const tab = tabOf(event);
      if (tab) activate(tab, false, event.detail > 0);
    },
    { signal },
  );

  document.addEventListener(
    "keydown",
    (event) => {
      const tab = tabOf(event);
      if (!tab || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      const root = tab.parentElement?.parentElement;
      const tabs = root ? tabsOf(root) : [];
      const at = tabs.indexOf(tab);
      const back = getComputedStyle(tab).direction === "rtl" ? "ArrowRight" : "ArrowLeft";
      const forward = back === "ArrowLeft" ? "ArrowRight" : "ArrowLeft";
      const to =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? tabs.length - 1
            : event.key === forward
              ? (at + 1) % tabs.length
              : event.key === back
                ? (at - 1 + tabs.length) % tabs.length
                : -1;
      const next = tabs[to];
      if (!next) return;
      event.preventDefault();
      activate(next, true);
    },
    { signal },
  );

  const state = {
    users: 1,
    restore: () => restore(),
    stop: () => {
      if (--state.users > 0) return;
      listeners.abort();
      codeMotion.stop();
      added.disconnect();
      style?.remove();
      document.documentElement.removeAttribute("data-tabs-ready");
      window.__comarkTabs = undefined;
    },
  };
  window.__comarkTabs = state;
  return state.stop;
}

export { css } from "./styles.ts";
