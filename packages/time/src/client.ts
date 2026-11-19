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
 * stays closed until both leave that time. Where the page runs the motion layer, it also opens the tooltips itself, so
 * the layer can raise each from behind its time. Returns a function that stops it. Every caller shares one set of
 * listeners, which stop with the last caller. The function is self-contained: the HTML renderer inlines its source as a
 * script, so it must not use anything from outside its body.
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
  const leaves = (time: Element, to: EventTarget | null) =>
    !(to instanceof Node && time.contains(to));

  // The motion layer only moves an element that is added to the page and removed from it, so with the layer the script
  // adds a copy of the pill while the tooltip is open, in place of the CSS that shows the pill. The layer is looked up
  // on each hover and focus, since its script may come later in the page, and once it has been seen the time keeps the
  // script's tooltip.
  const live = new Map<Element, HTMLElement>();
  const waiting = new Map<Element, number>();
  const hovered = new Set<Element>();
  const scripted = (time: Element) => {
    if (
      !time.hasAttribute("data-ctm-motion") &&
      !("__comarkMotion" in window && window.__comarkMotion)
    )
      return false;
    time.setAttribute("data-ctm-motion", "");
    return true;
  };
  const open = (time: Element) => {
    clearTimeout(waiting.get(time));
    waiting.delete(time);
    const text = time.querySelector(".ctm-pill")?.textContent;
    if (live.has(time) || time.hasAttribute("data-dismissed") || !text) return;
    const tip = document.createElement("span");
    tip.className = "ctm-tip ctm-live";
    // The time's own tooltip still describes it, so screen readers skip the copy.
    tip.setAttribute("aria-hidden", "true");
    tip.inert = true;
    tip.setAttribute("data-motion-appear", ".ctm");
    tip.textContent = text;
    time.append(tip);
    live.set(time, tip);
  };
  const close = (time: Element) => {
    clearTimeout(waiting.get(time));
    waiting.delete(time);
    live.get(time)?.remove();
    live.delete(time);
  };

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Escape") return;
      for (const time of document.querySelectorAll(".ctm:focus,.ctm:hover"))
        time.setAttribute("data-dismissed", "");
      for (const time of [...live.keys(), ...waiting.keys()]) close(time);
    },
    { signal },
  );
  document.addEventListener(
    "pointerover",
    (event) => {
      const time = timeOf(event.target);
      // A tap focuses the time, which opens it.
      if (!time || event.pointerType === "touch" || hovered.has(time) || !scripted(time)) return;
      hovered.add(time);
      if (!live.has(time))
        waiting.set(
          time,
          window.setTimeout(() => open(time), 300),
        );
    },
    { signal },
  );
  document.addEventListener(
    "focusin",
    (event) => {
      const time = timeOf(event.target);
      if (time && scripted(time)) open(time);
    },
    { signal },
  );
  document.addEventListener(
    "focusout",
    (event) => {
      const time = timeOf(event.target);
      reopen(time, event.relatedTarget, ":hover");
      if (time && leaves(time, event.relatedTarget) && !hovered.has(time)) close(time);
    },
    { signal },
  );
  document.addEventListener(
    "pointerout",
    (event) => {
      const time = timeOf(event.target);
      reopen(time, event.relatedTarget, ":focus");
      if (!time || !leaves(time, event.relatedTarget)) return;
      hovered.delete(time);
      if (!time.matches(":focus")) close(time);
    },
    { signal },
  );

  const state = {
    users: 1,
    stop: () => {
      if (--state.users > 0) return;
      listeners.abort();
      for (const time of [...live.keys(), ...waiting.keys()]) close(time);
      for (const time of document.querySelectorAll(".ctm[data-dismissed]"))
        time.removeAttribute("data-dismissed");
      for (const time of document.querySelectorAll(".ctm[data-ctm-motion]"))
        time.removeAttribute("data-ctm-motion");
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
 * language, English without one; `data-threshold` retains its relative-time policy. A `datetime` it can't read is left
 * alone. Returns a function that stops it, and it stops itself once `root` leaves the page.
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
      const found = describe(time.dateTime, {
        locale: time.getAttribute("lang") || undefined,
        threshold: time.getAttribute("data-threshold") || undefined,
      });
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
      const copy = time.querySelector(".ctm-live:not([data-motion=none])");
      if (copy && copy.textContent !== found.tip) copy.textContent = found.tip;
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
