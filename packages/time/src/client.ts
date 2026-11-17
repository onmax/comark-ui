import { css } from "./styles.ts";
import { addStyles as add } from "../../../shared/styles.ts";
import { describeTime } from "./describe.ts";

export { describeTime } from "./describe.ts";
export type { DescribeTimeOptions, TimeDescription } from "./describe.ts";

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

/**
 * Writes every `time[datetime]` under `root` again from its `datetime`, in the reader's zone and against the reader's
 * clock: now, whenever the page becomes visible again, and once a minute while it is visible. A time in comark-time's
 * markup gets its label, its tooltip, and its `data-mode`; any other gets its text. A time's `lang` sets the words'
 * language, English without one. A `datetime` it can't read is left alone. Returns a function that stops it, and it
 * stops itself once `root` leaves the page.
 *
 * It is self-contained: an HTML renderer inlines its source as a script and passes `describeTime`'s source as
 * `describe`, so it must not use anything from outside its body.
 */
export function relativize(
  root: ParentNode & Node,
  describe: typeof describeTime = describeTime,
): () => void {
  const refresh = () => {
    for (const time of root.querySelectorAll<HTMLTimeElement>("time[datetime]")) {
      const found = describe(time.dateTime, { locale: time.getAttribute("lang") || undefined });
      if (!found) continue;
      const pill = time.querySelector(".ctm-pill");
      // Only what changed is written, so an observer of the box sees nothing on a minute when no word moved.
      if (!pill) {
        if (time.textContent !== found.label) time.textContent = found.label;
        continue;
      }
      const label = time.firstChild;
      if (label instanceof Text) {
        if (label.data !== found.label) label.data = found.label;
      } else time.prepend(found.label);
      if (pill.textContent !== found.tip) pill.textContent = found.tip;
      if (time.dataset.mode !== found.mode) time.dataset.mode = found.mode;
    }
  };
  let timer: ReturnType<typeof setInterval> | undefined;
  const stop = () => {
    clearInterval(timer);
    document.removeEventListener("visibilitychange", wake);
  };
  const tick = () => (root.isConnected ? refresh() : stop());
  // A hidden tab keeps no timer; it catches up the moment it shows.
  const wake = () => {
    clearInterval(timer);
    timer = undefined;
    if (document.visibilityState === "hidden") return;
    tick();
    timer = setInterval(tick, 6e4);
  };
  refresh();
  document.addEventListener("visibilitychange", wake);
  if (document.visibilityState !== "hidden") timer = setInterval(tick, 6e4);
  return stop;
}

export { css };
