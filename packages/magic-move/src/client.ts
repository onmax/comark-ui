import { createCodeMotion } from "../../../shared/code-motion.ts";

declare global {
  interface Window {
    __comarkMagicMove?: { users: number; stop: () => void };
  }
}

/**
 * Starts the tabs and keys of every `.cmv` block on the page and returns a function that stops them. Every caller
 * shares one set of listeners, which stop with the last caller. The HTML renderer inlines it with the token mover,
 * so every other dependency must stay inside its body.
 */
export function start(css: string, createMotion = createCodeMotion): () => void {
  const running = window.__comarkMagicMove;
  if (running) {
    running.users++;
    return running.stop;
  }
  const listeners = new AbortController();
  const signal = listeners.signal;
  // The page may already carry the styles: the HTML renderer inlines them, and apps can import style.css.
  const style = document.querySelector("style[data-comark-magic-move],link[data-comark-magic-move]")
    ? null
    : document.createElement("style");
  if (style) {
    style.setAttribute("data-comark-magic-move", "");
    style.textContent = css;
    document.head.append(style);
  }
  document.documentElement.setAttribute("data-magic-move-ready", "");

  const stepsOf = (root: Element) => [
    ...root.querySelectorAll<HTMLElement>(":scope>.cmv-stage>.cmv-step"),
  ];
  const currentOf = (steps: HTMLElement[]) =>
    Math.max(
      0,
      steps.findIndex((step) => !step.hasAttribute("data-inactive")),
    );

  const tabsOf = (root: Element) => [
    ...root.querySelectorAll<HTMLElement>(":scope>.cmv-list>[role=tab]"),
  ];

  const codeMotion = createMotion("cmv");

  function show(root: Element, to: number) {
    const stage = root.querySelector<HTMLElement>(":scope>.cmv-stage");
    const steps = stepsOf(root);
    const from = steps[currentOf(steps)];
    const target = steps[to];
    if (!stage || !from || !target || from === target) return;
    codeMotion.show(stage, from, target);
    for (const [at, tab] of tabsOf(root).entries()) {
      tab.setAttribute("aria-selected", String(at === to));
      tab.tabIndex = at === to ? 0 : -1;
    }
  }

  const tabOf = (event: Event) =>
    event.target instanceof Element
      ? event.target.closest<HTMLElement>(".cmv>.cmv-list>[role=tab]")
      : null;

  document.addEventListener(
    "click",
    (event) => {
      const tab = tabOf(event);
      const root = tab?.closest(".cmv");
      if (tab && root) show(root, tabsOf(root).indexOf(tab));
    },
    { signal },
  );

  // The arrow keys move between the tabs in the reading direction and open the one they reach, as in comark-tabs.
  document.addEventListener(
    "keydown",
    (event) => {
      const tab = tabOf(event);
      const root = tab?.closest(".cmv");
      if (!tab || !root || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey)
        return;
      const tabs = tabsOf(root);
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
      show(root, to);
      next.focus();
    },
    { signal },
  );

  const state = {
    users: 1,
    stop: () => {
      if (--state.users > 0) return;
      listeners.abort();
      codeMotion.stop();
      style?.remove();
      document.documentElement.removeAttribute("data-magic-move-ready");
      window.__comarkMagicMove = undefined;
    },
  };
  window.__comarkMagicMove = state;
  return state.stop;
}

export { css } from "./styles.ts";
