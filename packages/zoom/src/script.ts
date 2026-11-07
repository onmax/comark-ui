/** What `comark-zoom:open` and `comark-zoom:change` carry, so a host can add its own UI to the zoomed view. */
export interface ZoomDetail {
  dialog: HTMLElement;
  header: HTMLElement;
  /** A layer over the zoomed content, sized to it. Draw pins or outlines here. */
  layer: HTMLElement;
  footer: HTMLElement;
  /** The zoomed copy of the item. Copies of its `data-zoom-context` ancestors sit around it. */
  content: HTMLElement;
  /** The column beside the zoomed content that holds a copy of the item's `data-zoom-aside`, or null when it has none. */
  aside: HTMLElement | null;
  /** The item on the page that is shown. */
  item: HTMLElement;
  index: number;
  items: HTMLElement[];
  /** The copy in the zoomed view of an element of the item or its aside, or null when it isn't one of them. */
  copyOf: (node: Element) => Element | null;
  /** The element on the page that a node of the zoomed copy or the aside copies, or null when it isn't one of them. */
  originalOf: (node: Element) => Element | null;
  /**
   * How much the zoomed copy, and `layer` with it, is scaled. It changes when the window resizes or a larger image
   * loads, so read it when drawing rather than keeping it. Divide a size by it to draw at the same size on screen.
   */
  readonly scale: number;
}

declare global {
  interface Window {
    __comarkZoom?: { users: number; stop: () => void };
  }
  interface ComarkZoomEventMap {
    "comark-zoom:open": CustomEvent<ZoomDetail>;
    "comark-zoom:change": CustomEvent<ZoomDetail>;
    "comark-zoom:close": CustomEvent<{ item: HTMLElement }>;
  }
  // The events bubble, so `document` and `window` hear them too.
  interface GlobalEventHandlersEventMap extends ComarkZoomEventMap {}
}

/**
 * The zoom script behind `start()`, which passes it the bundled styles. It is self-contained: the HTML renderer inlines
 * its source as a script, so it must not use anything from outside its body.
 */
export function script(css: string): () => void {
  const running = window.__comarkZoom;
  if (running) {
    running.users++;
    return running.stop;
  }
  const listeners = new AbortController();
  const signal = listeners.signal;

  // The page may already carry the styles: the HTML renderer inlines them, and apps can import style.css.
  const style = document.querySelector("style[data-comark-zoom],link[data-comark-zoom]")
    ? null
    : document.createElement("style");
  if (style) {
    style.setAttribute("data-comark-zoom", "");
    style.textContent = css;
    document.head.append(style);
  }

  const SELECTOR = "[data-zoom]";
  const INTERACTIVE = "a,button,input,textarea,select,summary,label,video,audio";
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const easing = "cubic-bezier(.22,1,.36,1)";

  type View = {
    dialog: HTMLElement;
    header: HTMLElement;
    title: HTMLElement;
    count: HTMLElement;
    stage: HTMLElement;
    aside: HTMLElement;
    footer: HTMLElement;
    frame: HTMLElement;
    // Each original shown, with its copy: the item, and its aside when it has one.
    pairs: Array<[Element, Element]>;
    items: HTMLElement[];
    index: number;
    scale: number;
    returnFocus: Element | null;
    pushed: boolean;
    closing: boolean;
    pressed: EventTarget | null;
  };
  let view: View | null = null;
  let restoration: ScrollRestoration | null = null;
  let restoring: (() => void) | null = null;

  const el = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className: string,
    attrs: Record<string, string> = {},
  ) => {
    const node = document.createElement(tag);
    node.className = className;
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    return node;
  };

  // A zoomable item inside another one zooms with it.
  function outermost(node: HTMLElement) {
    let item = node;
    for (
      let up = item.parentElement?.closest<HTMLElement>(SELECTOR);
      up;
      up = up.parentElement?.closest<HTMLElement>(SELECTOR)
    )
      item = up;
    return item;
  }

  // An item inside another one zooms with it, so only the outer one is a tab stop. Renderers can't know: a slide and
  // the screenshot inside it come from different plugins. A tabindex="0" goes even when the author set it, since Enter
  // there opens the outer item and the stop would be a dead one. Any other tabindex is the author's and stays.
  function settle(root: Element) {
    const nodes = [...root.querySelectorAll(`${SELECTOR}[tabindex="0"]`)];
    if (root.matches(`${SELECTOR}[tabindex="0"]`)) nodes.push(root);
    for (const node of nodes)
      if (node.parentElement?.closest(SELECTOR)) node.removeAttribute("tabindex");
  }

  // A named group spans the page. A gallery (a carousel, a comparison) groups the zoomable items inside it. Hidden
  // items, such as those in a closed tab, have no size to zoom from.
  function groupOf(item: HTMLElement): HTMLElement[] {
    const group = item.getAttribute("data-zoom-group");
    const gallery = item.closest("[data-zoom-gallery]");
    const nodes = group
      ? document.querySelectorAll<HTMLElement>(`[data-zoom-group="${CSS.escape(group)}"]`)
      : gallery?.querySelectorAll<HTMLElement>(SELECTOR);
    if (!nodes) return [item];
    return [...nodes].filter((node) => {
      if (node === item) return true;
      const { width, height } = node.getBoundingClientRect();
      return outermost(node) === node && !node.closest(".cz-dialog") && (width > 0 || height > 0);
    });
  }

  function titleOf(item: HTMLElement) {
    return (
      item.getAttribute("data-zoom-title") ||
      item.getAttribute("alt") ||
      item.querySelector("img")?.getAttribute("alt") ||
      // A slide's label is its position, which the counter already shows.
      (item.getAttribute("aria-roledescription") === "slide"
        ? ""
        : item.getAttribute("aria-label")) ||
      ""
    );
  }

  // A copy that can't open another zoom, steal focus, or repeat an id from the page.
  function strip(node: HTMLElement) {
    for (const part of [node, ...node.querySelectorAll<HTMLElement>("*")]) {
      for (const name of [
        "id",
        "data-zoom",
        "data-zoom-group",
        "data-zoom-context",
        "tabindex",
        "aria-haspopup",
      ])
        part.removeAttribute(name);
    }
    node.style.visibility = "";
    node.style.margin = "0";
    return node;
  }

  // The text styles that set a copy's size. Without the page's it would take the dialog's, reflow to another height,
  // and jump when the original takes its place at the end of the closing animation. Color stays the dialog's, which
  // matches its backdrop.
  const INHERITED = [
    "font-family",
    "font-size",
    "font-style",
    "font-weight",
    "letter-spacing",
    "text-align",
  ];

  // The browser reports line-height in pixels, whether the page set a ratio, which text of another size inside the
  // item scales by, or a length, which it keeps. Text at twice the size tells them apart.
  function lineHeight(parent: HTMLElement, page: CSSStyleDeclaration) {
    const size = parseFloat(page.fontSize);
    if (page.lineHeight === "normal" || !size) return page.lineHeight;
    // Important inline styles win over any rule of the host's, so the probe can't be restyled or take up room.
    const probe = el("span", "");
    probe.style.cssText = `all:initial!important;position:absolute!important;visibility:hidden!important;font-size:${size * 2}px!important;line-height:inherit!important`;
    parent.append(probe);
    const scaled = getComputedStyle(probe).lineHeight !== page.lineHeight;
    probe.remove();
    return scaled ? String(parseFloat(page.lineHeight) / size) : page.lineHeight;
  }

  // `data-zoom-context` names the ancestors whose classes and styles the item needs, such as the figure that carries a
  // screenshot's layout and the wrapper that carries its colors. Every ancestor that matches is copied, outermost first.
  function contexts(item: HTMLElement) {
    const selector = item.getAttribute("data-zoom-context");
    const found: HTMLElement[] = [];
    if (selector)
      for (let up = item.parentElement; up; up = up.parentElement)
        if (up.matches(selector)) found.unshift(up);
    return found;
  }

  // The copy goes inside empty copies of the item's contexts. `node` is the item, or its aside, which needs them too.
  function copy(item: HTMLElement, into: HTMLElement, node: HTMLElement = item) {
    // SAFETY: a deep clone of an HTMLElement is an HTMLElement of the same kind.
    const clone = strip(node.cloneNode(true) as HTMLElement);
    const around = contexts(item);
    const parent = (around[0] ?? item).parentElement;
    if (parent) {
      const page = getComputedStyle(parent);
      for (const name of INHERITED) into.style.setProperty(name, page.getPropertyValue(name));
      into.style.lineHeight = lineHeight(parent, page);
    }
    let inner = into;
    for (const context of around) {
      // SAFETY: a shallow clone of an HTMLElement is an HTMLElement of the same kind.
      const shell = strip(context.cloneNode(false) as HTMLElement);
      shell.style.color = "inherit";
      inner.append(shell);
      inner = shell;
    }
    inner.append(clone);
    return clone;
  }

  // `data-zoom-aside` names an element the zoomed view shows beside the item at its own size, such as a screenshot's
  // notes. It's the first match that neither holds the item nor sits in it, in its innermost context or else its parent.
  function asideOf(item: HTMLElement) {
    const selector = item.getAttribute("data-zoom-aside");
    const scope = contexts(item).at(-1) ?? item.parentElement;
    if (!selector || !scope) return null;
    return (
      [...scope.querySelectorAll<HTMLElement>(selector)].find(
        (node) => !item.contains(node) && !node.contains(item),
      ) ?? null
    );
  }

  // A copy has its original's tree, so the same child positions lead from one to the other.
  function across(pairs: Array<[Element, Element]>, node: Element, from: 0 | 1) {
    for (const pair of pairs) {
      const start = pair[from];
      if (!start.contains(node)) continue;
      const path: number[] = [];
      for (let at = node; at !== start && at.parentElement; at = at.parentElement)
        path.unshift([...at.parentElement.children].indexOf(at));
      let out: Element | undefined = pair[from === 0 ? 1 : 0];
      for (const index of path) out = out?.children[index];
      return out ?? null;
    }
    return null;
  }

  function measure(item: HTMLElement) {
    const rect = item.getBoundingClientRect();
    return { width: rect.width || 1, height: rect.height || 1, rect };
  }

  function detail(current: View): ZoomDetail {
    return {
      dialog: current.dialog,
      header: current.header,
      footer: current.footer,
      layer: current.frame.querySelector<HTMLElement>(".cz-layer")!,
      // SAFETY: render() always pairs the item with its copy first, and the copy of an HTMLElement is one too.
      content: current.pairs[0]![1] as HTMLElement,
      aside: current.aside.firstElementChild ? current.aside : null,
      item: current.items[current.index]!,
      index: current.index,
      items: current.items,
      copyOf: (node) => across(current.pairs, node, 0),
      originalOf: (node) => across(current.pairs, node, 1),
      get scale() {
        return current.scale;
      },
    };
  }

  // The zoomed copy keeps the item's width on the page and scales to fill the stage, so text stays sharp. Its height is
  // its own, which grows when an image in it loads after the page's. An image stops at its natural size, past which it
  // would blur. A copy that would have to shrink below its size on the page to fit the stage's height fills the
  // stage's width instead and scrolls, since a zoom that makes it smaller reads as zooming out.
  function place(current: View) {
    // Save the reading position relative to the displayed width, so a responsive page width can change too.
    const scroll = current.stage.scrollTop;
    const position =
      Math.max(0, scroll - (parseFloat(current.frame.style.marginBlockStart) || 0)) /
      (parseFloat(current.frame.style.width) * current.scale || 1);
    const item = current.items[current.index]!;
    const { width } = measure(item);
    current.frame.style.width = `${width}px`;
    current.frame.style.marginBlock = "";
    const height = current.frame.offsetHeight || 1;
    const box = current.stage.getBoundingClientRect();
    // A group's arrows sit over the sides of the stage, so the item fits between them.
    const next = current.dialog.querySelector(".cz-next");
    const arrows = next ? 2 * (box.right - next.getBoundingClientRect().left + 8) : 0;
    // An image grows no larger than its file. While a data-zoom-src file loads, the page's image may stretch, since
    // the larger file will take its place.
    const image = current.frame.firstElementChild;
    const large = image?.getAttribute("data-zoom-src");
    const natural =
      item instanceof HTMLImageElement &&
      image instanceof HTMLImageElement &&
      image.naturalWidth &&
      (!large || image.getAttribute("src") === large)
        ? Math.max(1, image.naturalWidth / width)
        : 4;
    const across = Math.min(box.width * 0.92, box.width - arrows) / width;
    const down = (box.height * 0.92) / height;
    const tall = down < Math.min(1, across);
    current.scale = Math.max(0.1, Math.min(across, tall ? Infinity : down, natural, 4));
    current.stage.toggleAttribute("data-scroll", tall);
    // The copy grows down from its top, and its margins give the stage's scroll the height it takes once scaled.
    const gap = box.height * 0.04;
    if (tall) {
      current.frame.style.marginBlock = `${gap}px ${height * (current.scale - 1) + gap}px`;
    }
    current.frame.style.transform = `scale(${current.scale})`;
    current.stage.scrollTop = tall && scroll > 0 ? position * width * current.scale + gap : 0;
  }

  // Whether an image of a copy is still shown, so a load that finishes after a close or a move changes nothing.
  const showing = (current: View, image: HTMLImageElement) =>
    view === current && !current.closing && current.frame.contains(image);

  // The page's image stays in the copy until the larger file has loaded, so the zoom never grows an empty box.
  function enlarge(current: View, image: HTMLImageElement) {
    const large = image.getAttribute("data-zoom-src");
    if (!large) return;
    const preload = new Image();
    preload.addEventListener("load", () => {
      if (!showing(current, image)) return;
      // A srcset, or a picture's sources, would win over src.
      for (const source of image.closest("picture")?.querySelectorAll("source") ?? [])
        source.remove();
      image.removeAttribute("srcset");
      image.removeAttribute("sizes");
      image.src = large;
    });
    preload.src = large;
  }

  // The move that puts the copy, at scale 1, over the item. It aims at the copy's center rather than the frame's,
  // since margins inside the copy can sit in the frame but outside the item on the page. The frame scales from its
  // center, or from its top when it scrolls, and that point stays put at any scale.
  function travel(current: View, item: HTMLElement) {
    const center = (node: Element) => {
      const rect = node.getBoundingClientRect();
      return [rect.left + rect.width / 2, rect.top + rect.height / 2] as const;
    };
    const frame = current.frame.getBoundingClientRect();
    const [ox, oy] = getComputedStyle(current.frame).transformOrigin.split(" ").map(parseFloat);
    const fx = frame.left + ox! * current.scale;
    const fy = frame.top + oy! * current.scale;
    const [cx, cy] = center(current.frame.firstElementChild!);
    const [tx, ty] = center(item);
    return `translate(${tx - fx - (cx - fx) / current.scale}px, ${ty - fy - (cy - fy) / current.scale}px)`;
  }

  function render(current: View) {
    const item = current.items[current.index]!;
    current.frame.replaceChildren();
    current.stage.scrollTop = 0;
    current.pairs = [[item, copy(item, current.frame)]];
    current.frame.append(el("div", "cz-layer"));
    // Set before place() measures the stage, which the aside's column narrows.
    const aside = asideOf(item);
    current.aside.replaceChildren();
    current.dialog.toggleAttribute("data-aside", Boolean(aside));
    if (aside) current.pairs.push([aside, copy(item, current.aside, aside)]);
    for (const image of current.frame.querySelectorAll("img")) {
      image.loading = "eager";
      image.addEventListener("load", () => showing(current, image) && place(current));
      enlarge(current, image);
    }
    current.title.textContent = titleOf(item);
    current.count.textContent =
      current.items.length > 1 ? `${current.index + 1} / ${current.items.length}` : "";
    current.dialog.setAttribute("aria-label", titleOf(item) || "Zoomed view");
    for (const [index, thumb] of [...current.footer.querySelectorAll(".cz-thumb")].entries())
      thumb.setAttribute("aria-current", String(index === current.index));
    place(current);
  }

  // Runs once the dialog is on the page, so each thumbnail has its size to fit a copy into.
  function thumbs(current: View) {
    if (current.items.length < 2) return;
    const strip = el("div", "cz-strip", { role: "group", "aria-label": "Items" });
    current.footer.append(strip);
    for (const [index, item] of current.items.entries()) {
      const thumb = el("button", "cz-thumb", {
        type: "button",
        "aria-label": titleOf(item) || `Item ${index + 1}`,
      });
      strip.append(thumb);
      const { width, height } = measure(item);
      const inner = el("div", "");
      inner.style.width = `${width}px`;
      inner.style.transform = `scale(${Math.min(thumb.clientWidth / width, thumb.clientHeight / height)})`;
      copy(item, inner);
      thumb.append(inner);
      thumb.addEventListener("click", () => go(index));
    }
  }

  function go(index: number) {
    if (!view || view.closing) return;
    view.items[view.index]!.style.visibility = "";
    view.index = (index + view.items.length) % view.items.length;
    view.items[view.index]!.style.visibility = "hidden";
    render(view);
    view.items[view.index]!.dispatchEvent(
      new CustomEvent("comark-zoom:change", { bubbles: true, detail: detail(view) }),
    );
  }

  // Locking scroll hides the page's scrollbar, which would widen the page and shift it sideways. Keep its space
  // reserved while the zoom is open, and touch nothing when the page has no classic scrollbar.
  const root = document.documentElement;
  let unlocked: { overflow: string; gutter: string; padding: string } | null = null;

  function lock() {
    // A smooth scroll still under way would carry on once the zoom closes and move the item away from the copy that
    // is flying back to it. Stop it where it is.
    scrollTo({ left: scrollX, top: scrollY, behavior: "instant" });
    const scrollbar = innerWidth - root.clientWidth;
    unlocked = {
      overflow: root.style.overflow,
      gutter: root.style.scrollbarGutter,
      padding: root.style.paddingRight,
    };
    // Reserve the space with padding before hiding overflow. Applying `scrollbar-gutter` at this point can itself
    // trigger a layout shift in Chromium, while padding preserves the existing content width deterministically.
    if (scrollbar > 0)
      root.style.paddingRight = `${parseFloat(getComputedStyle(root).paddingRight) + scrollbar}px`;
    root.style.overflow = "hidden";
  }

  function unlock() {
    if (!unlocked) return;
    root.style.overflow = unlocked.overflow;
    root.style.scrollbarGutter = unlocked.gutter;
    root.style.paddingRight = unlocked.padding;
    unlocked = null;
  }

  function restore(later = false) {
    const saved = restoration;
    restoration = null;
    if (!saved) return;
    const put = () => {
      history.scrollRestoration = saved;
      restoring = null;
    };
    if (!later) return put();
    // The browser restores scroll after popstate, so put the setting back once it has skipped that. A zoom that opens
    // first puts it back itself, so it doesn't save "manual" as the page's setting.
    restoring = put;
    setTimeout(() => restoring === put && put());
  }

  function open(item: HTMLElement) {
    if (view) return;
    const items = groupOf(item);
    const dialog = el("div", "cz-dialog", { role: "dialog", "aria-modal": "true", tabindex: "-1" });
    const header = el("div", "cz-header");
    const title = el("span", "cz-title");
    const count = el("span", "cz-count");
    const close = el("button", "cz-close", { type: "button", "aria-label": "Close" });
    close.textContent = "✕";
    header.append(title, count, close);
    const stage = el("div", "cz-stage");
    const frame = el("div", "cz-item");
    stage.append(frame);
    const aside = el("div", "cz-aside");
    const footer = el("div", "cz-footer");
    const backdrop = el("div", "cz-backdrop");
    dialog.append(backdrop, header, stage, aside, footer);
    const current: View = {
      dialog,
      header,
      title,
      count,
      stage,
      aside,
      footer,
      frame,
      pairs: [],
      items,
      index: Math.max(0, items.indexOf(item)),
      scale: 1,
      returnFocus: document.activeElement,
      pushed: false,
      closing: false,
      pressed: null,
    };
    if (items.length > 1) {
      for (const [name, step, label] of [
        ["cz-prev", -1, "Previous"],
        ["cz-next", 1, "Next"],
      ] as const) {
        const button = el("button", `cz-nav ${name}`, { type: "button", "aria-label": label });
        // Lucide's chevrons, as in comark-carousel.
        button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${step < 0 ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"}"/></svg>`;
        button.addEventListener("click", () => go(current.index + step));
        // Beside the stage, over its cell, so they stay put while a tall item scrolls.
        aside.before(button);
      }
    }
    view = current;
    document.body.append(dialog);
    thumbs(current);
    lock();
    render(current);
    close.addEventListener("click", () => void shut());
    // A click around the content closes it. A drag that starts on the content and ends outside does not.
    dialog.addEventListener("pointerdown", (event) => (current.pressed = event.target));
    dialog.addEventListener("click", (event) => {
      const around = event.target === stage || event.target === backdrop;
      if (around && current.pressed === event.target) void shut();
    });
    dialog.focus({ preventScroll: true });

    // Back closes the zoom, like a photo viewer. A frame with an opaque origin can't push history; Escape still works.
    // Going back would also restore the scroll position saved when the zoom opened, and the page may have moved since,
    // when the click landed during a smooth scroll; the page stays where it is instead.
    // The setting belongs to each history entry, so it goes on the page's entry before the zoom's is pushed.
    try {
      restoring?.();
      restoration = history.scrollRestoration;
      history.scrollRestoration = "manual";
      history.pushState({ ...history.state, comarkZoom: true }, "");
      current.pushed = true;
    } catch {
      if (restoration) history.scrollRestoration = restoration;
      restoration = null;
    }

    const shown = items[current.index]!;
    if (!motion.matches) {
      fly(current);
      const opening = frame.animate(
        [
          {
            transform: `${travel(current, shown)} scale(1)`,
          },
          { transform: `scale(${current.scale})` },
        ],
        { duration: 260, easing },
      );
      opening.finished.then(
        () => {
          if (current.closing) return;
          stage.removeAttribute("data-flying");
          frame.style.translate = "";
        },
        () => {},
      );
      for (const part of [backdrop, header, aside, footer])
        part.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
    }
    shown.style.visibility = "hidden";
    shown.dispatchEvent(
      new CustomEvent("comark-zoom:open", { bubbles: true, detail: detail(current) }),
    );
  }

  // The stage clips a zoomed copy to its own cell, which ends at the header, the footer, and an aside's column. On its
  // way between the page and the stage the copy crosses them, so the stage lets it out and draws it above them. A stage
  // that stops clipping loses its scroll position and its scrollbar, so the copy is moved back to where it was.
  function fly(current: View) {
    // An interrupted opening already has the compensation that closing must preserve.
    if (current.stage.hasAttribute("data-flying")) return;
    const before = current.frame.getBoundingClientRect();
    current.stage.setAttribute("data-flying", "");
    const after = current.frame.getBoundingClientRect();
    current.frame.style.translate = `${before.left - after.left}px ${before.top - after.top}px`;
  }

  // Closing from the page goes back in history, so the zoom's entry goes away. stop() doesn't: with its listeners gone,
  // that late popstate could close a zoom opened after it. The entry stays, and a later Back does nothing.
  async function shut(from: "page" | "history" | "stop" = "page") {
    const current = view;
    if (!current || current.closing) return;
    current.closing = true;
    if (from === "page" && current.pushed && history.state?.comarkZoom) history.back();
    else if (from !== "history") restore();
    const item = current.items[current.index]!;
    if (!motion.matches) {
      // A close can come while the opening animation still runs. Measure the frame where it settles, so the path back
      // ends on the item, and start from where it is now.
      const now = getComputedStyle(current.frame).transform;
      for (const animation of current.frame.getAnimations()) animation.cancel();
      fly(current);
      const to = item.getBoundingClientRect();
      const visible = to.bottom > 0 && to.top < innerHeight;
      const animations = [
        ...current.dialog.querySelectorAll<HTMLElement>(
          ".cz-backdrop,.cz-header,.cz-aside,.cz-footer,.cz-nav",
        ),
      ].map((part) =>
        part.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: "forwards" }),
      );
      animations.push(
        current.frame.animate(
          visible
            ? [{ transform: now }, { transform: `${travel(current, item)} scale(1)` }]
            : [{ opacity: 1 }, { opacity: 0 }],
          { duration: 200, easing, fill: "forwards" },
        ),
      );
      await Promise.all(animations.map((animation) => animation.finished.catch(() => {})));
    }
    for (const node of current.items) node.style.visibility = "";
    current.dialog.remove();
    unlock();
    view = null;
    if (current.returnFocus instanceof HTMLElement)
      current.returnFocus.focus({ preventScroll: true });
    item.dispatchEvent(new CustomEvent("comark-zoom:close", { bubbles: true, detail: { item } }));
  }

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const found = target?.closest<HTMLElement>(SELECTOR);
      const item = found && outermost(found);
      if (!item || item.closest(".cz-dialog") || event.defaultPrevented) return;
      // Links and controls inside a zoomable block keep working.
      const control = target?.closest(INTERACTIVE);
      if (control && control !== item && item.contains(control)) return;
      if (!getSelection()?.isCollapsed) return;
      event.preventDefault();
      open(item);
    },
    { signal },
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (!view) {
        const item =
          event.target instanceof HTMLElement && event.target.matches(SELECTOR)
            ? outermost(event.target)
            : null;
        if (item && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          open(item);
        }
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        void shut();
      } else if (event.key === "ArrowLeft" && view.items.length > 1) go(view.index - 1);
      else if (event.key === "ArrowRight" && view.items.length > 1) go(view.index + 1);
      else if (event.key === "Tab") {
        // Keep focus in the dialog.
        const focusable = [
          ...view.dialog.querySelectorAll<HTMLElement>(
            "button,[href],[tabindex]:not([tabindex='-1'])",
          ),
        ];
        if (!focusable.length) return;
        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;
        if (
          event.shiftKey &&
          (document.activeElement === first || document.activeElement === view.dialog)
        ) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    },
    { signal },
  );

  addEventListener(
    "popstate",
    () => {
      restore(true);
      void shut("history");
    },
    { signal },
  );
  addEventListener("resize", () => view && place(view), { signal });

  // Items keep coming after the script starts: the rest of the page after the HTML renderer's inline script, and
  // whatever an app renders later.
  settle(document.documentElement);
  const added = new MutationObserver((records) => {
    for (const record of records)
      for (const node of record.addedNodes) if (node instanceof Element) settle(node);
  });
  added.observe(document.documentElement, { childList: true, subtree: true });

  const state = {
    users: 1,
    stop: () => {
      if (--state.users > 0) return;
      added.disconnect();
      listeners.abort();
      style?.remove();
      void shut("stop");
      window.__comarkZoom = undefined;
    },
  };
  window.__comarkZoom = state;
  return state.stop;
}
