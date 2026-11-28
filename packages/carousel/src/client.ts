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
    const track = root.querySelector<HTMLElement>(":scope>.cc-run>.cc-track");
    const slides = track
      ? [...track.querySelectorAll<HTMLElement>(":scope>.cc-grid>.cc-slide")]
      : [];
    const step = (by: number) =>
      root.querySelector<HTMLElement>(`:scope>.cc-controls [data-carousel-step='${by}']`);
    const count = root.querySelector(":scope>.cc-controls .cc-count");
    return { track, slides, count, prev: step(-1), next: step(1) };
  };

  const rtl = (track: Element) => getComputedStyle(track).direction === "rtl";
  // Convert the rendered panel distances to scroll coordinates, even on a scaled page or in RTL.
  function geometry(column: Element, track: HTMLElement, slides: HTMLElement[]) {
    // With --cc-bleed or --cc-bleed-start the track overhangs the carousel's column: a page is what fits in the
    // column, and it rests lined up with the column's start.
    const columnStyle = getComputedStyle(column);
    const paddingLeft = parseFloat(columnStyle.paddingLeft);
    const paddingRight = parseFloat(columnStyle.paddingRight);
    const columnWidth = column.clientWidth - paddingLeft - paddingRight;
    const width = track.clientWidth - Math.max(0, track.offsetWidth - columnWidth);
    const bounds = track.getBoundingClientRect();
    const scale = bounds.width / track.offsetWidth || 1;
    const direction = rtl(track) ? -1 : 1;
    const scrolled = direction * track.scrollLeft;
    const inset =
      direction === -1
        ? track.offsetWidth - track.clientWidth - track.clientLeft
        : track.clientLeft;
    const origin = direction === -1 ? bounds.right : bounds.left;
    const columnBounds = column.getBoundingClientRect();
    const columnEdge = direction === -1 ? columnBounds.right : columnBounds.left;
    const columnInset =
      direction === -1
        ? parseFloat(columnStyle.borderRightWidth) + paddingRight
        : parseFloat(columnStyle.borderLeftWidth) + paddingLeft;
    const lead = Math.max(0, (direction * (columnEdge - origin)) / scale + columnInset - inset);
    const panels = slides.map((slide) => slide.getBoundingClientRect());
    const first = panels[0]!;
    const starts = panels.map((panel) => {
      const edge = direction === -1 ? panel.right : panel.left;
      return (direction * (edge - origin)) / scale - inset + scrolled - lead;
    });
    const pitch = starts.length > 1 ? starts[1]! - starts[0]! : 0;
    const shown =
      pitch > 0
        ? Math.min(
            slides.length,
            1 + Math.max(0, Math.floor((width - first.width / scale + 1) / pitch)),
          )
        : 1;
    const lastStart = slides.length - shown;
    const panelEnd = starts.at(-1)! + panels.at(-1)!.width / scale;
    const end = Math.max(
      0,
      Math.min(starts[lastStart]!, panelEnd - width, track.scrollWidth - track.clientWidth),
    );
    const atEnd = end - scrolled <= 1;
    const stops = starts.slice(0, lastStart + 1).map((start) => Math.max(0, Math.min(start, end)));
    const current = atEnd
      ? lastStart
      : stops.reduce(
          (nearest, stop, index) =>
            Math.abs(scrolled - stop) < Math.abs(scrolled - stops[nearest]!) ? index : nearest,
          0,
        );
    return { shown, lastStart, direction, scrolled, end, atEnd, stops, current };
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
    index: (current: number, lastStart: number) => number,
    behavior?: ScrollBehavior,
  ) {
    const { track, slides } = parts(root);
    if (!track?.clientWidth || !slides.length) return false;
    const { lastStart, direction, scrolled, end, stops, current } = geometry(root, track, slides);
    if (end <= 1) return false;
    const requested = index(targets.get(root) ?? current, lastStart);
    const target = Math.max(0, Math.min(requested, lastStart));
    const to = stops[target]!;
    if (Math.abs(to - scrolled) <= 1) {
      if (targets.delete(root)) track.scrollTo({ left: direction * to, behavior: "instant" });
      return true;
    }
    const how =
      behavior ?? (matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth");
    if (how === "smooth") targets.set(root, target);
    else targets.delete(root);
    settle(root);
    track.scrollTo({ left: direction * to, behavior: how });
    return true;
  }

  const page = (root: Element, by: number) => show(root, (index) => index + by);

  function sync(root: Element) {
    const { track, slides, count, prev, next } = parts(root);
    // A carousel in a hidden tab or a closed details measures 0 wide, which would read as the end.
    if (!track?.clientWidth || !slides.length) return;
    // The counter names every slide in view, such as 2–3 / 5. It counts from the track's width rather than from what
    // is on screen, so it doesn't flicker mid-scroll, and a slide that only peeks in on a narrow page doesn't count.
    const { shown, current: first, scrolled, stops, atEnd } = geometry(root, track, slides);
    const last = first + shown;
    const text = `${first + 1}${last - first > 1 ? `–${last}` : ""} / ${slides.length}`;
    // Only on a change: the counter is a live region, so each write is read out.
    if (count && count.textContent !== text) count.textContent = text;
    prev?.setAttribute("aria-disabled", String(scrolled - stops[0]! < 2));
    next?.setAttribute("aria-disabled", String(atEnd));
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
    if (node.matches(".cc-track")) resized.observe(node);
    for (const track of node.querySelectorAll(".cc-track")) resized.observe(track);
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
      if (!target || !root || !track || target.closest(keyed)) return;
      // A wide code block or table scrolls with these keys.
      for (
        let at: Element | null = target;
        at && at !== track && at !== root;
        at = at.parentElement
      )
        if (scrolls(at)) return;
      const handled =
        event.key === "Home"
          ? show(root, () => 0)
          : event.key === "End"
            ? show(root, (_, lastStart) => lastStart)
            : page(root, event.key === (rtl(track) ? "ArrowLeft" : "ArrowRight") ? 1 : -1);
      if (handled) event.preventDefault();
    },
    { signal },
  );

  // Paging in the zoomed view moves the carousel too, so closing it lands on the slide that was shown.
  const follow = (event: Event) => {
    const slide =
      event.target instanceof Element ? event.target.closest<HTMLElement>(".cc-slide") : null;
    const root = slide?.closest(".cc");
    if (!slide || !root) return;
    show(root, () => parts(root).slides.indexOf(slide), "instant");
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
