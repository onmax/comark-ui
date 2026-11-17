import { css } from "./styles.ts";
import { addStyles as add } from "../../../shared/styles.ts";

declare global {
  interface Window {
    __comarkTime?: { users: number; stop: () => void };
  }
}

/** Adds the time styles to the page once. */
export const addStyles = (): void => add("time", css);

/**
 * Adds the time styles to the page, and lets Escape close the tooltip of the time that has focus or the pointer. It
 * stays closed until both leave that time. Returns a function that stops it. Every caller shares one set of listeners,
 * which stop with the last caller. The function is self-contained: the HTML renderer inlines its source as a script,
 * so it must not use anything from outside its body.
 */
export function start(css: string): () => void {
  const running = window.__comarkTime;
  if (running) {
    running.users++;
    return running.stop;
  }
  const listeners = new AbortController();
  const signal = listeners.signal;
  // The page may already carry the styles: the HTML renderer inlines them, and apps can import style.css.
  const style = document.querySelector("style[data-comark-time],link[data-comark-time]")
    ? null
    : document.createElement("style");
  if (style) {
    style.setAttribute("data-comark-time", "");
    style.textContent = css;
    document.head.append(style);
  }

  const timeOf = (target: EventTarget | null) =>
    target instanceof Element ? target.closest(".ctm") : null;
  const reopen = (time: Element | null, to: EventTarget | null, still: string) => {
    if (time && !(to instanceof Node && time.contains(to)) && !time.matches(still))
      time.removeAttribute("data-dismissed");
  };

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Escape") return;
      for (const time of document.querySelectorAll(".ctm:focus,.ctm:hover"))
        time.setAttribute("data-dismissed", "");
    },
    { signal },
  );
  document.addEventListener(
    "focusout",
    (event) => reopen(timeOf(event.target), event.relatedTarget, ":hover"),
    { signal },
  );
  document.addEventListener(
    "pointerout",
    (event) => reopen(timeOf(event.target), event.relatedTarget, ":focus"),
    { signal },
  );

  const state = {
    users: 1,
    stop: () => {
      if (--state.users > 0) return;
      listeners.abort();
      for (const time of document.querySelectorAll(".ctm[data-dismissed]"))
        time.removeAttribute("data-dismissed");
      style?.remove();
      window.__comarkTime = undefined;
    },
  };
  window.__comarkTime = state;
  return state.stop;
}

export { css };
