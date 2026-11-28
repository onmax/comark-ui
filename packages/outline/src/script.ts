declare global {
  interface Window {
    __comarkOutline?: { users: number; root: Element; stop: () => void; watch: () => void };
  }
}

/**
 * Places the page's side outline (`.cto-rail`) beside the element its document renders into, marks the heading being
 * read, and returns a function that stops it. Every caller shares one set of listeners, which stop with the last caller.
 * It is self-contained: the HTML renderer inlines its source as a script, so it must not use anything from outside its
 * body.
 *
 * The page talks to it through `--comark-inset-end` on `:root`, the width it covers at the right edge, such as a side
 * panel. When the outline needs a column of its own beside wide blocks, it sets `data-comark-rail` on `<html>`, and the
 * page shrinks `--comark-wide-end` by `--comark-rail-width`, so wide blocks move toward the room before the text.
 */
export function start(): () => void {
  const root = document.documentElement;
  const running = window.__comarkOutline;
  if (running?.root === root) {
    running.users++;
    running.watch();
    return running.stop;
  }
  // `document.open()` swaps the page's elements under the same window, so the old instance watches elements that left.
  if (running) {
    running.users = 1;
    running.stop();
  }
  const listeners = new AbortController();
  const signal = listeners.signal;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  // The outline keeps 1.5rem from the edge, and 4rem from the text, closing to 2.5rem only when it needs the room. It
  // runs up to 15rem wide and shows from 11rem. Beside wide blocks it keeps a 200px column, the 264px of
  // --comark-rail-width with its gap.
  const EDGE = 24;
  const GAP = 64;
  const CLOSE = 40;
  const WIDTH = 240;
  const RESERVED = 200;
  const NARROWEST = 176;

  // The list keeps the marked link 24px inside its top and 48px inside its bottom, where it fades out, and brings one
  // outside that to a third of the way down.
  const FOLLOW_TOP = 24;
  const FOLLOW_BOTTOM = 48;

  const rail = () => document.querySelector<HTMLElement>(".cto-rail");
  // Only the list scrolls, under the title.
  const list = (nav: HTMLElement) => nav.querySelector<HTMLElement>(":scope > ul");
  const reserve = (on: boolean) => root.toggleAttribute("data-comark-rail", on);
  const length = (value: string) => {
    const number = parseFloat(value) || 0;
    return value.trim().endsWith("rem")
      ? number * parseFloat(getComputedStyle(root).fontSize)
      : number;
  };
  const target = (link: HTMLAnchorElement, scope: Element) => {
    const id = link.getAttribute("href")?.slice(1);
    if (!id) return null;
    try {
      return scope.querySelector<HTMLElement>(`#${CSS.escape(decodeURIComponent(id))}`);
    } catch {
      return null;
    }
  };

  function place(nav: HTMLElement) {
    const parent = nav.parentElement;
    if (!parent) return;
    const inset = length(getComputedStyle(root).getPropertyValue("--comark-inset-end"));
    const room = root.clientWidth - inset - EDGE;
    const text = () => {
      const style = getComputedStyle(parent);
      const box = parent.getBoundingClientRect();
      const end = box.right - (parseFloat(style.paddingRight) || 0);
      return { end, width: end - box.left - (parseFloat(style.paddingLeft) || 0) };
    };
    const width = (block: Element) => block.getBoundingClientRect().width;
    const beside = (blocks: Element[], widest: number) => {
      const edge = Math.max(
        text().end,
        ...blocks.map((block) => block.getBoundingClientRect().right),
      );
      const space = room - edge;
      const gap = Math.min(GAP, Math.max(CLOSE, space - widest));
      const fits = Math.min(space - gap, widest);
      return fits >= NARROWEST ? { left: edge + gap, width: fits } : null;
    };

    // Measured without the outline's column, so a block that only fits the column while it's kept still counts.
    reserve(false);
    const { end, width: column } = text();
    // A wide block counts, and so does a part right inside a block that runs past the text, such as a carousel's
    // slides running into the room beside it (comark-carousel's --cc-bleed). The outline itself doesn't.
    const wide = [...parent.children].flatMap((child) => {
      if (child === nav) return [];
      if (child.hasAttribute("data-wide")) return width(child) > column + 1 ? [child] : [];
      if (getComputedStyle(child).overflowX !== "visible") return [];
      return [...child.children].filter((part) => part.getBoundingClientRect().right > end + 1);
    });
    let spot = beside(wide, WIDTH);
    if (!spot && wide.length) {
      // A block with its own width, such as a diagram, matters more than the outline: keeping the column may narrow a
      // compare, which fills whatever room it gets, but never a diagram.
      const own = wide.filter((block) =>
        getComputedStyle(block).getPropertyValue("--comark-wide-width").trim(),
      );
      const before = own.map(width);
      reserve(true);
      spot = own.every((block, index) => width(block) >= before[index]! - 1)
        ? beside(wide, RESERVED)
        : null;
      if (!spot) reserve(false);
    }
    // Placement can change the visible height or wrap links, even if the current heading stays the same.
    marked = null;
    nav.toggleAttribute("data-fits", !!spot);
    if (spot) {
      nav.style.left = `${spot.left}px`;
      nav.style.width = `${spot.width}px`;
    }
  }

  function mark(nav: HTMLElement) {
    const parent = nav.parentElement;
    if (!parent) return;
    const links = [...nav.querySelectorAll<HTMLAnchorElement>("a[href^='#']")];
    // A heading counts as read once it passes a little below the outline's top.
    const line = (parseFloat(getComputedStyle(nav).top) || 0) + 40;
    // At the bottom of what scrolls, the last section is the one being read, however short it is.
    const box = scroller?.contains(parent) ? scroller : root;
    const end = box.scrollTop > 0 && box.scrollTop + box.clientHeight >= box.scrollHeight - 2;
    let current = 0;
    links.forEach((link, index) => {
      const heading = target(link, parent);
      if (heading && (end || heading.getBoundingClientRect().top <= line)) current = index;
    });
    links.forEach((link, index) =>
      index === current
        ? link.setAttribute("aria-current", "location")
        : link.removeAttribute("aria-current"),
    );
    const link = links[current];
    if (link && link !== marked && nav.hasAttribute("data-fits")) {
      marked = link;
      follow(nav, link);
    }
  }

  // Scrolls the list so the marked link stays in view, unless the reader is pointing at the list, which they may be
  // scrolling themselves. Measured on screen, so it works inside a shadow root too.
  function follow(nav: HTMLElement, link: HTMLElement) {
    const scroll = list(nav);
    if (!scroll || scroll.matches(":hover")) return;
    // Stop an earlier follow before testing visibility at its current position.
    scroll.scrollTo({ top: scroll.scrollTop, behavior: "instant" });
    const box = scroll.getBoundingClientRect();
    const item = link.getBoundingClientRect();
    if (item.top >= box.top + FOLLOW_TOP && item.bottom <= box.bottom - FOLLOW_BOTTOM) return;
    scroll.scrollTo({
      top: scroll.scrollTop + item.top - box.top - box.height / 3,
      behavior: motion.matches ? "auto" : "smooth",
    });
  }

  // Fades the list out at the bottom while more links sit below what shows.
  function fade(nav: HTMLElement) {
    const scroll = list(nav);
    scroll?.toggleAttribute(
      "data-more",
      scroll.scrollTop + scroll.clientHeight < scroll.scrollHeight - 1,
    );
  }

  // The element whose scroll moved the text last, when the page scrolls it in a container of its own.
  let scroller: Element | null = null;
  // The link the list last followed.
  let marked: HTMLElement | null = null;
  let frame = 0;
  let placing = false;
  const update = (again: boolean) => {
    placing ||= again;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (placing) watch();
      else {
        const nav = rail();
        if (nav) mark(nav);
      }
      placing = false;
    });
  };

  const resized = new ResizeObserver(() => update(true));
  let observed: Element | null = null;
  function watch() {
    const nav = rail();
    const parent = nav?.parentElement ?? null;
    if (parent !== observed) {
      if (observed) resized.unobserve(observed);
      if (parent) resized.observe(parent);
      observed = parent;
    }
    if (!nav) return;
    place(nav);
    mark(nav);
    fade(nav);
  }

  addEventListener("resize", () => update(true), { signal });
  // Captured on the document, so a page that scrolls its text in a container of its own marks the heading too.
  document.addEventListener(
    "scroll",
    (event) => {
      const nav = rail();
      if (nav && event.target === list(nav)) {
        fade(nav);
        return;
      }
      // Only a scroll that moves the document counts, not a code block's or another widget's.
      const parent = nav?.parentElement;
      if (event.target === document) scroller = null;
      else if (event.target instanceof Element && parent && event.target.contains(parent))
        scroller = event.target;
      update(false);
    },
    {
      capture: true,
      passive: true,
      signal,
    },
  );
  // The page sets --comark-inset-end with a style or a class on the root, and may slide its column when it does.
  const inset = new MutationObserver(() => update(true));
  inset.observe(root, { attributes: true, attributeFilter: ["style", "class"] });
  document.addEventListener(
    "transitionend",
    (event) => {
      const parent = rail()?.parentElement;
      if (parent && event.target instanceof Element && event.target.contains(parent)) update(true);
    },
    { signal },
  );
  document.addEventListener(
    "click",
    (event) => {
      const link =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>(".cto-rail a[href^='#']")
          : null;
      const scope = link?.closest(".cto-rail")?.parentElement;
      const heading = link && scope ? target(link, scope) : null;
      if (!link || !heading || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      heading.scrollIntoView({ behavior: motion.matches ? "auto" : "smooth", block: "start" });
      try {
        history.pushState(history.state, "", link.hash);
      } catch {
        // A sandboxed frame may refuse to change its history; the scroll is what matters.
      }
    },
    { signal },
  );

  const state = {
    users: 1,
    root,
    watch,
    stop: () => {
      if (--state.users > 0) return;
      listeners.abort();
      resized.disconnect();
      inset.disconnect();
      cancelAnimationFrame(frame);
      reserve(false);
      rail()?.removeAttribute("data-fits");
      delete window.__comarkOutline;
    },
  };
  window.__comarkOutline = state;
  watch();
  return state.stop;
}
