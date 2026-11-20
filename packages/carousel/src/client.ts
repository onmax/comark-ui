declare global {
  interface Window {
    __comarkCarousel?: { users: number; stop: () => void; watch: () => void };
  }
}

/**
 * Starts the arrows, counter, and keys of every `.cc` carousel on the page and returns a function that stops them. Every
 * caller shares one set of listeners, which stop with the last caller. The function is self-contained: the HTML
 * renderer inlines its source as a script, so it must not use anything from outside its body.
 */
export function start(css: string): () => void {
  const running = window.__comarkCarousel;
  if (running) {
    running.users++;
    running.watch();
    return running.stop;
  }
  const listeners = new AbortController();
  const signal = listeners.signal;
  // The page may already carry the styles: the HTML renderer inlines them, and apps can import style.css.
  const style = document.querySelector("style[data-comark-carousel],link[data-comark-carousel]")
    ? null
    : document.createElement("style");
  if (style) {
    style.setAttribute("data-comark-carousel", "");
    style.textContent = css;
    document.head.append(style);
  }
  document.documentElement.setAttribute("data-carousel-ready", "");

  // Only the carousel's own parts: a slide can hold another carousel, such as a `::compare`, with parts of its own.
  const parts = (root: Element) => {
    const track = root.querySelector<HTMLElement>(":scope>.cc-track");
    const slides = track ? [...track.querySelectorAll<HTMLElement>(":scope>.cc-slide")] : [];
    const step = (by: number) =>
      root.querySelector<HTMLElement>(`:scope>.cc-controls [data-carousel-step='${by}']`);
    const count = root.querySelector(":scope>.cc-controls .cc-count");
    return { track, slides, count, prev: step(-1), next: step(1) };
  };

  // Distances from the track's start edge, so a right-to-left page, where scrollLeft runs negative, reads the same.
  const rtl = (track: Element) => getComputedStyle(track).direction === "rtl";
  const offset = (track: HTMLElement, slide: HTMLElement) => {
    const outer = track.getBoundingClientRect();
    const inner = slide.getBoundingClientRect();
    return rtl(track) ? outer.right - inner.right : inner.left - outer.left;
  };

  function visible(track: HTMLElement, slides: HTMLElement[]) {
    if (slides.length < 2) return 1;
    const first = slides[0]!.getBoundingClientRect();
    const second = slides[1]!.getBoundingClientRect();
    const pitch = Math.abs(second.left - first.left);
    return pitch > 0
      ? Math.min(
          slides.length,
          1 + Math.max(0, Math.floor((track.clientWidth - first.width + 1) / pitch)),
        )
      : 1;
  }

  const limit = (track: HTMLElement) => track.scrollWidth - track.clientWidth;
  const atEnd = (track: HTMLElement) => limit(track) - Math.abs(track.scrollLeft) <= 1;

  // At the clamped endpoint a peeking slide can still start closer to the edge than the last slide.
  function current(track: HTMLElement, slides: HTMLElement[], lastStart: number) {
    if (atEnd(track)) return lastStart;
    const offsets = slides.map((slide) => Math.abs(offset(track, slide)));
    return Math.min(lastStart, offsets.indexOf(Math.min(...offsets)));
  }

  // Where each carousel is heading while it scrolls smoothly, so quick clicks add up instead of reading a position
  // mid-animation. scrollend clears it; without that event, a short pause in scrolling does.
  const targets = new WeakMap<Element, number>();
  const settles = "onscrollend" in window;
  const timers = new Map<Element, number>();
  const settle = (root: Element) => {
    if (settles) return;
    clearTimeout(timers.get(root));
    timers.set(
      root,
      window.setTimeout(() => {
        targets.delete(root);
        timers.delete(root);
      }, 150),
    );
  };

  function show(
    root: Element,
    index: number | ((current: number) => number),
    behavior?: ScrollBehavior,
  ) {
    const { track, slides } = parts(root);
    if (!track?.clientWidth || !slides.length) return;
    const lastStart = slides.length - visible(track, slides);
    const requested =
      typeof index === "number"
        ? index
        : index(targets.get(root) ?? current(track, slides, lastStart));
    const target = Math.max(0, Math.min(requested, lastStart));
    const direction = rtl(track) ? -1 : 1;
    const scrolled = direction * track.scrollLeft;
    const end = limit(track);
    const to =
      target > 0 && target === lastStart
        ? end
        : Math.max(0, Math.min(scrolled + offset(track, slides[target]!), end));
    if (Math.abs(to - scrolled) <= 1) {
      if (targets.delete(root)) track.scrollTo({ left: direction * to, behavior: "instant" });
      return;
    }
    const how =
      behavior ?? (matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth");
    if (how === "smooth") targets.set(root, target);
    else targets.delete(root);
    settle(root);
    track.scrollTo({ left: direction * to, behavior: how });
  }

  const page = (root: Element, by: number) => show(root, (index) => index + by);

  function sync(root: Element) {
    const { track, slides, count, prev, next } = parts(root);
    // A carousel in a hidden tab or a closed details measures 0 wide, which would read as the end.
    if (!track?.clientWidth || !slides.length) return;
    const scrolled = Math.abs(track.scrollLeft);
    const end = atEnd(track);
    // The counter names every slide in view, such as 2–3 / 5. It counts from the track's width rather than from what
    // is on screen, so it doesn't flicker mid-scroll, and a slide that only peeks in on a narrow page doesn't count.
    const shown = visible(track, slides);
    const first = current(track, slides, slides.length - shown);
    const last = first + shown;
    const text = `${first + 1}${last - first > 1 ? `–${last}` : ""} / ${slides.length}`;
    // Only on a change: the counter is a live region, so each write is read out.
    if (count && count.textContent !== text) count.textContent = text;
    prev?.setAttribute("aria-disabled", String(scrolled < 2));
    next?.setAttribute("aria-disabled", String(end));
  }

  // Each track syncs when it's first observed and whenever its size changes, including when it's shown.
  const resized = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const root = entry.target.closest(".cc");
      if (root) sync(root);
    }
  });
  const observe = (node: Node) => {
    if (!(node instanceof Element)) return;
    if (node.matches(".cc>.cc-track")) resized.observe(node);
    for (const track of node.querySelectorAll(".cc>.cc-track")) resized.observe(track);
  };
  const watch = () => observe(document.documentElement);
  watch();
  // The HTML renderer inlines the script after the first carousel, so the page's later carousels arrive after it.
  const added = new MutationObserver((records) => {
    for (const record of records) record.addedNodes.forEach(observe);
  });
  added.observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener(
    "click",
    (event) => {
      const button =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>("[data-carousel-step]")
          : null;
      const root = button?.closest(".cc");
      if (!button || !root || button.getAttribute("aria-disabled") === "true") return;
      page(root, Number(button.getAttribute("data-carousel-step")));
    },
    { signal },
  );

  const trackRoot = (event: Event) =>
    event.target instanceof Element && event.target.matches(".cc-track")
      ? event.target.closest(".cc")
      : null;

  // Scroll events don't bubble, but a capturing listener on the document still sees every track.
  document.addEventListener(
    "scroll",
    (event) => {
      const root = trackRoot(event);
      if (!root) return;
      sync(root);
      settle(root);
    },
    { capture: true, passive: true, signal },
  );
  if (settles)
    document.addEventListener(
      "scrollend",
      (event) => {
        const root = trackRoot(event);
        if (root) targets.delete(root);
      },
      { capture: true, passive: true, signal },
    );

  // Keys that belong to something in a slide. Links and buttons don't use the arrows, so paging from them is fine.
  const keyed =
    "input,textarea,select,video,audio,summary,[contenteditable]," +
    "[role=tablist],[role=slider],[role=radiogroup],[role=listbox],[role=combobox],[role=spinbutton]," +
    "[role=menu],[role=menubar],[role=tree]";
  const scrolls = (element: Element) =>
    element.scrollWidth > element.clientWidth &&
    /auto|scroll/.test(getComputedStyle(element).overflowX);

  document.addEventListener(
    "keydown",
    (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      // Alt+Left is the browser's Back, and the other modifiers select text or switch tabs.
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      )
        return;
      // The zoomed view pages with the same keys.
      if (document.querySelector(".cz-dialog")) return;
      const target = event.target instanceof Element ? event.target : null;
      const root = target?.closest(".cc");
      const track = root ? parts(root).track : null;
      if (!target || !root || !track || limit(track) <= 0 || target.closest(keyed)) return;
      // A wide code block or table scrolls with these keys.
      for (
        let at: Element | null = target;
        at && at !== track && at !== root;
        at = at.parentElement
      )
        if (scrolls(at)) return;
      event.preventDefault();
      if (event.key === "Home") show(root, 0);
      else if (event.key === "End") show(root, parts(root).slides.length - 1);
      else page(root, event.key === (rtl(track) ? "ArrowLeft" : "ArrowRight") ? 1 : -1);
    },
    { signal },
  );

  // Paging in the zoomed view moves the carousel too, so closing it lands on the slide that was shown.
  const follow = (event: Event) => {
    const slide =
      event.target instanceof Element ? event.target.closest<HTMLElement>(".cc-slide") : null;
    const root = slide?.closest(".cc");
    if (!slide || !root) return;
    show(root, parts(root).slides.indexOf(slide), "instant");
    sync(root);
  };
  document.addEventListener("comark-zoom:change", follow, { signal });

  const state = {
    users: 1,
    watch,
    stop: () => {
      if (--state.users > 0) return;
      listeners.abort();
      resized.disconnect();
      added.disconnect();
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
      style?.remove();
      document.documentElement.removeAttribute("data-carousel-ready");
      window.__comarkCarousel = undefined;
    },
  };
  window.__comarkCarousel = state;
  return state.stop;
}

export { css } from "./styles.ts";
