import { css } from "./styles.ts";

declare global {
  interface Window {
    __comarkSources?: { users: number; stop: () => void };
  }
}

/**
 * Adds the sources styles to the page, and shows a card with a source's icon, site, and title while a pointer rests on
 * its citation or the keyboard focuses it, in place of the browser's tooltip. Returns a function that stops it. Every
 * caller shares one set of listeners, which stop with the last caller. The function is self-contained: the HTML renderer
 * inlines its source as a script, so it must not use anything from outside its body.
 */
export function start(css: string): () => void {
  const running = window.__comarkSources;
  if (running) {
    running.users++;
    return running.stop;
  }
  const listeners = new AbortController();
  const signal = listeners.signal;
  // The page may already carry the styles: the HTML renderer inlines them, and apps can import style.css.
  const style = document.querySelector("style[data-comark-sources],link[data-comark-sources]")
    ? null
    : document.createElement("style");
  if (style) {
    style.setAttribute("data-comark-sources", "");
    style.textContent = css;
    document.head.append(style);
  }

  const gap = 4;
  const svg = (name: string, paths: string) =>
    `<svg class="${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  let card: HTMLElement | undefined;
  let current: HTMLAnchorElement | undefined;
  // A citation whose card Escape closed stays closed until the pointer or focus leaves it.
  let dismissed: HTMLAnchorElement | undefined;
  let opening = 0;
  let closing = 0;
  let closed = 0;

  const citation = (target: EventTarget | null) =>
    target instanceof Element ? target.closest<HTMLAnchorElement>(".cso-cite a[href^='#']") : null;
  const inCard = (target: EventTarget | null) => target instanceof Node && !!card?.contains(target);

  // The browser's tooltip would show beside the card, so the title moves to a description screen readers still read.
  const quiet = (link: HTMLAnchorElement) => {
    const title = link.getAttribute("title");
    if (title === null) return;
    link.removeAttribute("title");
    link.setAttribute("data-cso-title", title);
    link.setAttribute("aria-description", title);
  };

  // The citation's own source: the nearest list item with its id, since a page can hold several documents' lists.
  function sourceOf(link: HTMLAnchorElement) {
    const id = `#${CSS.escape(decodeURIComponent(link.hash.slice(1)))}`;
    for (let at = link.parentElement; at; at = at.parentElement) {
      const item = at.querySelector(id);
      if (item) return item;
    }
  }

  function fill(link: HTMLAnchorElement) {
    const item = sourceOf(link);
    const source = item?.querySelector<HTMLAnchorElement>("a[href]:not(.cso-back)");
    if (!item || !source) return;
    if (!card) {
      card = document.createElement("div");
      card.className = "cso-card";
      card.id = "cso-card";
      card.setAttribute("popover", "manual");
      card.innerHTML =
        '<a class="cso-card-link" tabindex="-1"><span class="cso-card-site"><img class="cso-card-image" alt="">' +
        svg(
          "cso-card-globe",
          '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
        ) +
        `<span class="cso-card-host"></span>${svg("cso-card-arrow", '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>')}</span>` +
        '<span class="cso-card-title"></span></a>';
    }
    // An app that replaces the page's body takes the card with it.
    if (!card.isConnected) document.body.append(card);
    const anchor = card.querySelector<HTMLAnchorElement>(".cso-card-link");
    const image = card.querySelector<HTMLImageElement>(".cso-card-image");
    const host = card.querySelector(".cso-card-host");
    const title = card.querySelector(".cso-card-title");
    if (!anchor || !image || !host || !title) return;
    anchor.href = source.href;
    for (const name of ["target", "rel"]) {
      const value = source.getAttribute(name);
      if (value === null) anchor.removeAttribute(name);
      else anchor.setAttribute(name, value);
    }
    host.textContent = source.hostname.replace(/^www\./, "") || source.href;
    title.textContent =
      link.getAttribute("data-cso-title") || link.title || source.textContent?.trim() || "";
    // The icon is the one the list shows, such as a comark-chips favicon or avatar, so the card asks no other site.
    const shown = item.querySelector("img");
    const src =
      shown && !(shown.complete && !shown.naturalWidth) ? shown.currentSrc || shown.src : "";
    if (src) image.src = src;
    else image.removeAttribute("src");
    card.setAttribute(
      "data-icon",
      !src ? "globe" : shown?.closest("[data-kind='avatar']") ? "avatar" : "image",
    );
    // The card sits at the end of the page, so it takes the theme the citation sees, wherever that's set.
    const theme = getComputedStyle(link);
    for (const token of ["background", "foreground", "muted", "border", "radius", "font"])
      card.style.setProperty(`--_comark-${token}`, theme.getPropertyValue(`--_comark-${token}`));
    return card;
  }

  // Above the citation, or below it when there's no room, centered on it and kept inside the viewport.
  function place() {
    if (!card || !current) return;
    const at = current.getBoundingClientRect();
    const { clientWidth: right, clientHeight: bottom } = document.documentElement;
    if (at.bottom < 0 || at.top > bottom) return hide(true);
    // Measured at the corner, so the width the last place left it doesn't narrow the card.
    card.style.left = "0";
    card.style.top = "0";
    const width = card.offsetWidth;
    const height = card.offsetHeight;
    const center = at.left + at.width / 2;
    const left = Math.max(8, Math.min(center - width / 2, right - width - 8));
    const above = at.top - gap - height >= 8 || at.top > bottom - at.bottom;
    card.style.left = `${left}px`;
    card.style.top = `${above ? at.top - gap - height : at.bottom + gap}px`;
    card.style.transformOrigin = `${center - left}px ${above ? "100%" : "0"}`;
  }

  function show(link: HTMLAnchorElement, instant: boolean) {
    clearTimeout(opening);
    clearTimeout(closing);
    const filled = fill(link);
    if (!filled) return hide(true);
    if (current && current !== link) {
      current.removeAttribute("aria-describedby");
      current.removeAttribute("data-cso-open");
    }
    current = link;
    link.setAttribute("aria-describedby", filled.id);
    link.setAttribute("data-cso-open", "");
    filled.toggleAttribute("data-instant", instant);
    if (!filled.matches(":popover-open")) filled.showPopover();
    place();
  }

  function hide(instant = false) {
    clearTimeout(opening);
    clearTimeout(closing);
    if (!card || !current) return;
    current.removeAttribute("aria-describedby");
    current.removeAttribute("data-cso-open");
    current = undefined;
    card.toggleAttribute("data-instant", instant);
    if (card.matches(":popover-open")) card.hidePopover();
    closed = performance.now();
  }

  // A browser without popovers keeps the title tooltip.
  if ("showPopover" in HTMLElement.prototype) {
    // Touch has no hover: a tap follows the citation to its source, as before.
    document.addEventListener(
      "pointerover",
      (event) => {
        if (event.pointerType === "touch") return;
        const link = citation(event.target);
        if (!link) {
          if (inCard(event.target)) clearTimeout(closing);
          return;
        }
        quiet(link);
        clearTimeout(closing);
        if (link === current || link === dismissed) return;
        clearTimeout(opening);
        // Once a card is open, or has just closed, the next opens at once, so reading along a line stays quick.
        if (current || performance.now() - closed < 400) show(link, true);
        else opening = window.setTimeout(() => show(link, false), 300);
      },
      { signal },
    );
    document.addEventListener(
      "pointerout",
      (event) => {
        if (event.pointerType === "touch") return;
        const link = citation(event.target);
        if (!link && !inCard(event.target)) return;
        const to = event.relatedTarget;
        if (to instanceof Node && (link?.contains(to) || inCard(to) || current?.contains(to)))
          return;
        if (link === dismissed) dismissed = undefined;
        clearTimeout(opening);
        // A card the keyboard opened stays while its citation has focus.
        if (current && !current.matches(":focus-visible"))
          closing = window.setTimeout(() => hide(), 150);
      },
      { signal },
    );
    document.addEventListener(
      "focusin",
      (event) => {
        const link = citation(event.target);
        if (!link?.matches(":focus-visible")) return;
        quiet(link);
        if (link !== dismissed) show(link, true);
      },
      { signal },
    );
    document.addEventListener(
      "focusout",
      (event) => {
        const link = citation(event.target);
        if (!link) return;
        if (link === dismissed) dismissed = undefined;
        if (link === current && !inCard(event.relatedTarget)) hide(true);
      },
      { signal },
    );
    document.addEventListener(
      "keydown",
      (event) => {
        if (event.key !== "Escape" || !current) return;
        dismissed = current;
        hide(true);
      },
      { signal },
    );
    // Following a citation scrolls to the list, and following the card leaves for the source.
    document.addEventListener(
      "click",
      (event) => {
        if (citation(event.target) || inCard(event.target)) hide(true);
      },
      { signal },
    );
    const follow = () => current && place();
    window.addEventListener("scroll", follow, { capture: true, passive: true, signal });
    window.addEventListener("resize", follow, { passive: true, signal });
  }

  const state = {
    users: 1,
    stop: () => {
      if (--state.users > 0) return;
      listeners.abort();
      clearTimeout(opening);
      clearTimeout(closing);
      card?.remove();
      for (const link of document.querySelectorAll(".cso-cite a[data-cso-title]")) {
        link.setAttribute("title", link.getAttribute("data-cso-title") ?? "");
        for (const name of [
          "data-cso-title",
          "data-cso-open",
          "aria-description",
          "aria-describedby",
        ])
          link.removeAttribute(name);
      }
      style?.remove();
      window.__comarkSources = undefined;
    },
  };
  window.__comarkSources = state;
  return state.stop;
}

export { css };
