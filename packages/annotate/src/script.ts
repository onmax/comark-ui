declare global {
  interface Window {
    __comarkAnnotate?: { users: number; stop: () => void };
  }
}

/**
 * Starts every `.ca-swipe` slider on the page: a drag anywhere on the pair moves the divider and coasts on release,
 * the handle takes arrow keys, and a click that doesn't drag still zooms. Also lets a reader copy a screenshot with its
 * marks, by its Copy button, Control or Command+C, or the browser's menu on the image. Returns a function that stops it. The
 * function is self-contained: the HTML renderer inlines its source as a script, so it must not use anything from
 * outside its body.
 */
export function start(): () => void {
  const running = window.__comarkAnnotate;
  if (running) {
    running.users++;
    return running.stop;
  }
  const listeners = new AbortController();
  const signal = listeners.signal;
  const root = document.documentElement;
  root.setAttribute("data-annotate-ready", "");
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  // A press that moves less than this is a click, which zooms.
  const SLOP = 4;

  type Drag = { swipe: HTMLElement; id: number; x: number; moved: boolean; t: number; v: number };
  let drag: Drag | null = null;
  // Whether the last press on each slider dragged. A browser may send that press's click late, even after the next
  // press starts, so it's dropped when the click comes rather than on a timer.
  const dragged = new WeakMap<HTMLElement, boolean>();
  const splits = new WeakMap<HTMLElement, number>();
  const coasting = new WeakMap<HTMLElement, number>();

  const swipeOf = (target: EventTarget | null) =>
    target instanceof Element ? target.closest<HTMLElement>(".ca-swipe") : null;
  const splitOf = (swipe: HTMLElement) =>
    splits.get(swipe) ??
    Number(swipe.querySelector(".ca-handle")?.getAttribute("aria-valuenow") ?? 50);
  const at = (swipe: HTMLElement, x: number) => {
    const box = swipe.getBoundingClientRect();
    return ((x - box.left) / (box.width || 1)) * 100;
  };

  function set(swipe: HTMLElement, value: number) {
    const split = Math.min(100, Math.max(0, value));
    splits.set(swipe, split);
    swipe.style.setProperty("--ca-split", `${split}%`);
    const handle = swipe.querySelector<HTMLElement>(".ca-handle");
    if (!handle) return split;
    const shown = Math.round(split);
    handle.setAttribute("aria-valuenow", String(shown));
    const labels = [...swipe.querySelectorAll(".ca-side .ca-label")].map(
      (label) => label.textContent,
    );
    if (labels.length === 2)
      handle.setAttribute("aria-valuetext", `${labels[0]} ${shown}%, ${labels[1]} ${100 - shown}%`);
    return split;
  }

  function stop(swipe: HTMLElement) {
    cancelAnimationFrame(coasting.get(swipe) ?? 0);
    coasting.delete(swipe);
  }

  // The divider keeps the speed it was let go at and slows to a stop, like a flicked list.
  function coast(swipe: HTMLElement, velocity: number) {
    if (motion.matches || Math.abs(velocity) < 0.02) return;
    let v = Math.max(-0.2, Math.min(velocity, 0.2));
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(now - last, 32);
      last = now;
      const before = splitOf(swipe);
      const after = set(swipe, before + v * dt);
      v *= 0.85 ** (dt / 16);
      if (Math.abs(v) < 0.005 || after === 0 || after === 100) return stop(swipe);
      coasting.set(swipe, requestAnimationFrame(step));
    };
    coasting.set(swipe, requestAnimationFrame(step));
  }

  document.addEventListener(
    "pointerdown",
    (event) => {
      const swipe = swipeOf(event.target);
      if (!swipe || !event.isPrimary || event.button !== 0) return;
      if (event.target instanceof Element && event.target.closest("a")) return;
      stop(swipe);
      drag = {
        swipe,
        id: event.pointerId,
        x: event.clientX,
        moved: false,
        t: event.timeStamp,
        v: 0,
      };
    },
    { signal },
  );

  document.addEventListener(
    "pointermove",
    (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      if (!drag.moved) {
        if (Math.abs(event.clientX - drag.x) < SLOP) return;
        drag.moved = true;
        drag.swipe.setPointerCapture(drag.id);
        drag.swipe.setAttribute("data-dragging", "");
      }
      const before = splitOf(drag.swipe);
      const after = set(drag.swipe, at(drag.swipe, event.clientX));
      const dt = event.timeStamp - drag.t;
      if (dt > 0) drag.v = 0.8 * ((after - before) / dt) + 0.2 * drag.v;
      drag.t = event.timeStamp;
    },
    { signal },
  );

  const release = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.id) return;
    const { swipe, moved, v, t } = drag;
    drag = null;
    dragged.set(swipe, moved && event.type === "pointerup");
    if (!moved) return;
    swipe.removeAttribute("data-dragging");
    // A pause before letting go means the reader placed the divider, not flicked it.
    if (event.type === "pointerup" && event.timeStamp - t < 80) coast(swipe, v);
  };
  document.addEventListener("pointerup", release, { signal });
  document.addEventListener("pointercancel", release, { signal });

  // Zoom skips a click that's already handled: the one ending a drag, and any on the handle, which is there to drag.
  addEventListener(
    "click",
    (event) => {
      const swipe = swipeOf(event.target);
      if (!swipe) return;
      const handle = event.target instanceof Element && event.target.closest(".ca-handle");
      if (!handle && !dragged.get(swipe)) return;
      dragged.delete(swipe);
      event.preventDefault();
    },
    { capture: true, signal },
  );

  // Firefox drags the image out of the page otherwise.
  document.addEventListener(
    "dragstart",
    (event) => {
      if (swipeOf(event.target)) event.preventDefault();
    },
    { signal },
  );

  const KEYS = new Map<string, (split: number) => number>([
    ["ArrowLeft", (split) => split - 5],
    ["ArrowDown", (split) => split - 5],
    ["ArrowRight", (split) => split + 5],
    ["ArrowUp", (split) => split + 5],
    ["PageDown", (split) => split - 25],
    ["PageUp", (split) => split + 25],
    ["Home", () => 0],
    ["End", () => 100],
  ]);
  document.addEventListener(
    "keydown",
    (event) => {
      const move = KEYS.get(event.key);
      const handle = event.target instanceof Element ? event.target.closest(".ca-handle") : null;
      const swipe = swipeOf(handle);
      if (!move || !swipe) return;
      event.preventDefault();
      stop(swipe);
      set(swipe, move(splitOf(swipe)));
    },
    { signal },
  );

  // Zoom copies the slider without its tab stops; the handle needs its own back to move by key.
  const focusable = () => {
    for (const handle of document.querySelectorAll(".cz-dialog .ca-handle"))
      handle.setAttribute("tabindex", "0");
  };
  document.addEventListener("comark-zoom:open", focusable, { signal });
  document.addEventListener("comark-zoom:change", focusable, { signal });

  // Copying. The marks are HTML and SVG over a plain image, so the browser's own Copy Image leaves them out. The copy
  // paints the screenshot's figure as it rests on the page (image, marks, stamps, arrows, and notes) onto a canvas.
  const copying = "clipboard" in navigator && "ClipboardItem" in window;
  if (copying) root.setAttribute("data-annotate-copy", "");
  const PAD = 16;
  const SKIP = ".ca-copy,.ca-copy-status,.ca-overlay";
  type Box = [x: number, y: number, width: number, height: number];
  type Paint = (context: CanvasRenderingContext2D, source: HTMLImageElement) => void;
  type Made = { key: string; blob: Blob; url: string };
  const made = new WeakMap<HTMLElement, Made>();
  const making = new WeakMap<HTMLElement, Promise<Made>>();
  const urls = new Set<string>();
  let zoomed: HTMLElement | null = null;

  // A zoomed screenshot is a copy without ids; the page's source behind it is the one to paint.
  const figureOf = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return null;
    if (target.closest(".cz-dialog"))
      return zoomed &&
        target.closest(
          zoomed.matches(".ca-side") || zoomed.matches(".ca-swipe")
            ? ".ca-swipe"
            : ".ca-screenshot",
        )
        ? zoomed
        : null;
    return target.closest<HTMLElement>(".ca-screenshot");
  };
  const keyOf = (figure: HTMLElement) => {
    const { width, height } = figure.getBoundingClientRect();
    return `${Math.round(width)}x${Math.round(height)} ${getComputedStyle(figure).color}`;
  };

  const probe = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const shown = new Map<string, boolean>();
  const visible = (color: string) => {
    if (!probe || color === "transparent") return false;
    let seen = shown.get(color);
    if (seen === undefined) {
      probe.clearRect(0, 0, 1, 1);
      probe.fillStyle = color;
      probe.fillRect(0, 0, 1, 1);
      seen = probe.getImageData(0, 0, 1, 1).data[3]! > 0;
      shown.set(color, seen);
    }
    return seen;
  };
  const round = (context: CanvasRenderingContext2D, [x, y, width, height]: Box, radius: number) => {
    context.beginPath();
    const r = Math.max(0, Math.min(radius, width / 2, height / 2));
    if (!r) {
      context.rect(x, y, width, height);
      return;
    }
    // Keep this compatible with browsers that have Canvas 2D but not roundRect().
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  };

  async function compose(figure: HTMLElement) {
    const image = figure.querySelector<HTMLImageElement>(".ca-frame>img:not(.ca-overlay)");
    if (!image) throw new Error("The screenshot has no image.");
    image.loading = "eager";
    if (!image.complete || !image.naturalWidth) await image.decode();
    await document.fonts.ready;
    const paint: Paint[] = [];
    // Read with every mark at rest, so a hovered one doesn't come out highlighted. Transitions stay off until the hover
    // state is back, or it would replay.
    figure.setAttribute("data-ca-capture", "still");
    const box = figure.getBoundingClientRect();
    const [left, top] = [box.left - PAD, box.top - PAD];
    const place = (rect: DOMRect): Box => [
      rect.left - left,
      rect.top - top,
      rect.width,
      rect.height,
    ];
    const fade = (element: Element) => {
      let alpha = 1;
      for (let at: Element | null = element; at && figure.contains(at); at = at.parentElement)
        alpha *= Number(getComputedStyle(at).opacity) || 0;
      return alpha;
    };
    try {
      const walker = document.createTreeWalker(
        figure,
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
        // An svg paints as a whole, so its paths aren't visited on their own.
        (node) =>
          node instanceof Element &&
          (node.matches(SKIP) || (node instanceof SVGElement && !(node instanceof SVGSVGElement)))
            ? NodeFilter.FILTER_REJECT
            : NodeFilter.FILTER_ACCEPT,
      );
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (node instanceof Text && node.parentElement) {
          const style = getComputedStyle(node.parentElement);
          const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
          const { color, letterSpacing } = style;
          const alpha = fade(node.parentElement);
          const range = document.createRange();
          // Word by word, each where the page laid it out, so wrapping and inline code match.
          for (const match of node.data.matchAll(/\S+/g)) {
            range.setStart(node, match.index);
            range.setEnd(node, match.index + match[0].length);
            const rect = range.getClientRects()[0];
            if (!rect?.width) continue;
            const [x, y, , height] = place(rect);
            paint.push((context) => {
              context.font = font;
              context.letterSpacing = letterSpacing === "normal" ? "0px" : letterSpacing;
              context.fillStyle = color;
              context.globalAlpha = alpha;
              const metrics = context.measureText(match[0]);
              const ascent =
                Number.isFinite(metrics.fontBoundingBoxAscent) && metrics.fontBoundingBoxAscent > 0
                  ? metrics.fontBoundingBoxAscent
                  : Number.isFinite(metrics.actualBoundingBoxAscent) &&
                      metrics.actualBoundingBoxAscent > 0
                    ? metrics.actualBoundingBoxAscent
                    : parseFloat(style.fontSize) || height * 0.8;
              const descent =
                Number.isFinite(metrics.fontBoundingBoxDescent) &&
                metrics.fontBoundingBoxDescent >= 0
                  ? metrics.fontBoundingBoxDescent
                  : Number.isFinite(metrics.actualBoundingBoxDescent) &&
                      metrics.actualBoundingBoxDescent >= 0
                    ? metrics.actualBoundingBoxDescent
                    : Math.max(0, (parseFloat(style.fontSize) || height) - ascent);
              context.fillText(match[0], x, y + (height - ascent - descent) / 2 + ascent);
            });
          }
        } else if (node === image) {
          const style = getComputedStyle(image);
          const rect = place(image.getBoundingClientRect());
          const radius = parseFloat(style.borderTopLeftRadius) || 0;
          const outline = style.outlineStyle === "none" ? 0 : parseFloat(style.outlineWidth) || 0;
          const inset = -(parseFloat(style.outlineOffset) || 0) - outline / 2;
          const { outlineColor } = style;
          paint.push((context, source) => {
            context.save();
            round(context, rect, radius);
            context.clip();
            context.drawImage(source, ...rect);
            context.restore();
            if (!outline) return;
            const [x, y, width, height] = rect;
            round(
              context,
              [x + inset, y + inset, width - 2 * inset, height - 2 * inset],
              radius - inset,
            );
            context.strokeStyle = outlineColor;
            context.lineWidth = outline;
            context.stroke();
          });
        } else if (node instanceof SVGSVGElement) {
          // Marks stretch their viewBox over the area and keep their strokes the same width, as on the page.
          const view = node.viewBox.baseVal;
          const rect = node.getBoundingClientRect();
          if (!view?.width || !view.height || !rect.width || !rect.height) continue;
          const [x, y, width, height] = place(rect);
          const alpha = fade(node);
          // Let the SVG renderer handle non-scaling strokes. A canvas transform cannot preserve
          // a constant stroke width for arbitrary path directions under non-uniform scaling.
          const paths = [...node.querySelectorAll("path")].map((path) => {
            const style = getComputedStyle(path);
            // SAFETY: a shallow clone of an SVGPathElement is an SVGPathElement.
            const copy = path.cloneNode(false) as SVGPathElement;
            copy.setAttribute("fill", style.fill);
            copy.setAttribute("stroke", style.stroke);
            copy.setAttribute("stroke-width", style.strokeWidth);
            copy.setAttribute("stroke-linecap", style.strokeLinecap);
            copy.setAttribute("stroke-linejoin", style.strokeLinejoin);
            copy.setAttribute("stroke-opacity", style.strokeOpacity);
            copy.setAttribute("fill-opacity", style.fillOpacity);
            copy.setAttribute("vector-effect", style.vectorEffect);
            return copy.outerHTML;
          });
          if (!paths.length) continue;
          // A stretched mark may draw past its viewBox, as a circle's loop does, and the page shows it with
          // `overflow: visible`. An image crops at its viewBox, so the copy grows it to every path and a stroke's
          // width more, and draws it over a rectangle grown to match.
          const aspect = node.getAttribute("preserveAspectRatio") || "xMidYMid meet";
          let [x1, y1, x2, y2] = [view.x, view.y, view.x + view.width, view.y + view.height];
          if (aspect === "none") {
            const [padX, padY] = [(6 * view.width) / rect.width, (6 * view.height) / rect.height];
            for (const path of node.querySelectorAll("path")) {
              const bounds = path.getBBox();
              x1 = Math.min(x1, bounds.x - padX);
              y1 = Math.min(y1, bounds.y - padY);
              x2 = Math.max(x2, bounds.x + bounds.width + padX);
              y2 = Math.max(y2, bounds.y + bounds.height + padY);
            }
          }
          const [scaleX, scaleY] = [width / view.width, height / view.height];
          const source = new Image();
          source.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x1} ${y1} ${x2 - x1} ${y2 - y1}" preserveAspectRatio="${aspect}">${paths.join("")}</svg>`,
          )}`;
          await source.decode();
          paint.push((context) => {
            context.globalAlpha = alpha;
            context.drawImage(
              source,
              x + (x1 - view.x) * scaleX,
              y + (y1 - view.y) * scaleY,
              (x2 - x1) * scaleX,
              (y2 - y1) * scaleY,
            );
          });
        } else if (node instanceof HTMLElement) {
          // Stamps, notes, and inline code: a fill, a border, and the ring a stamp draws with a spread shadow.
          const style = getComputedStyle(node);
          const fill = visible(style.backgroundColor) ? style.backgroundColor : "";
          const ring = /(\S+\([^)]*\)|#\w+|[a-z]+) 0px 0px 0px ([\d.]+)px/i.exec(style.boxShadow);
          const border =
            style.borderTopStyle === "none" || !visible(style.borderTopColor)
              ? 0
              : parseFloat(style.borderTopWidth) || 0;
          if (!fill && !(ring && visible(ring[1]!)) && !border) continue;
          const radius = parseFloat(style.borderTopLeftRadius) || 0;
          const { borderTopColor } = style;
          const alpha = fade(node);
          for (const rect of node.getClientRects()) {
            const [x, y, width, height] = place(rect);
            paint.push((context) => {
              context.globalAlpha = alpha;
              if (ring) {
                const spread = Number(ring[2]);
                context.fillStyle = ring[1]!;
                round(
                  context,
                  [x - spread, y - spread, width + 2 * spread, height + 2 * spread],
                  radius + spread,
                );
                context.fill();
              }
              if (fill) {
                context.fillStyle = fill;
                round(context, [x, y, width, height], radius);
                context.fill();
              }
              if (!border) return;
              context.strokeStyle = borderTopColor;
              context.lineWidth = border;
              round(
                context,
                [x + border / 2, y + border / 2, width - border, height - border],
                radius,
              );
              context.stroke();
            });
          }
        }
      }
    } finally {
      figure.setAttribute("data-ca-capture", "settle");
      void figure.offsetWidth;
      figure.removeAttribute("data-ca-capture");
    }

    const width = box.width + 2 * PAD;
    const height = box.height + 2 * PAD;
    const shot = image.getBoundingClientRect();
    // As sharp as the screen, or as the image file when it has more pixels than it's shown at.
    const scale = Math.min(
      3,
      Math.max(devicePixelRatio || 1, image.naturalWidth / (shot.width || 1)),
      8192 / width,
      8192 / height,
    );
    const background =
      getComputedStyle(figure).getPropertyValue("--_comark-background").trim() || "#fff";
    const render = (source: HTMLImageElement) =>
      new Promise<Blob>((resolve, reject) => {
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        const context = canvas.getContext("2d");
        if (!context) return reject(new Error("No canvas."));
        context.scale(scale, scale);
        context.fillStyle = background;
        context.fillRect(0, 0, width, height);
        for (const step of paint) {
          context.save();
          step(context, source);
          context.restore();
        }
        // Throws a SecurityError when the image came from another origin without CORS.
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("No image."))),
          "image/png",
        );
      });
    try {
      return await render(image);
    } catch (error) {
      if (!(error instanceof DOMException) || error.name !== "SecurityError") throw error;
      // The page's image has no CORS, which would break it on hosts that don't send the headers, so only the copy asks.
      const open = new Image();
      open.crossOrigin = "anonymous";
      open.src = image.currentSrc || image.src;
      await open.decode().catch(() => {
        throw error;
      });
      return render(open);
    }
  }

  // The copy is made ahead, on hover, so a right-click can find it ready.
  function prepare(figure: HTMLElement) {
    const key = keyOf(figure);
    const ready = made.get(figure);
    if (ready?.key === key) return Promise.resolve(ready);
    const pending = making.get(figure);
    if (pending) return pending;
    const next = compose(figure)
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        urls.add(url);
        const old = made.get(figure);
        if (old) {
          URL.revokeObjectURL(old.url);
          urls.delete(old.url);
        }
        const fresh = { key, blob, url };
        made.set(figure, fresh);
        overlayOf(figure.querySelector(".ca-frame")).src = url;
        return fresh;
      })
      .finally(() => making.delete(figure));
    making.set(figure, next);
    return next;
  }

  // An invisible copy over the image that only takes the pointer for a right-click, so the browser's Copy Image, Save
  // Image, and drag-free menu all get the screenshot with its marks. Clicks and hovers still reach the marks.
  function overlayOf(frame: Element | null) {
    let overlay = frame?.querySelector<HTMLImageElement>(":scope>.ca-overlay");
    if (!overlay) {
      overlay = document.createElement("img");
      overlay.className = "ca-overlay";
      overlay.alt = "";
      overlay.draggable = false;
      frame?.append(overlay);
    }
    return overlay;
  }
  let armed: HTMLImageElement | null = null;
  let disarming = 0;
  const disarm = () => {
    clearTimeout(disarming);
    armed?.removeAttribute("data-menu");
    armed = null;
  };

  document.addEventListener(
    "pointerover",
    (event) => {
      if (event.pointerType !== "mouse") return;
      const figure = figureOf(event.target);
      if (figure) prepare(figure).catch(() => {});
    },
    { signal },
  );

  document.addEventListener(
    "pointerdown",
    (event) => {
      disarm();
      if (event.button !== 2 && !(event.button === 0 && event.ctrlKey)) return;
      const target = event.target instanceof Element ? event.target : null;
      const frame = target?.closest(".ca-frame");
      const figure = figureOf(frame ?? null);
      const ready = figure && made.get(figure);
      if (!frame || !ready || target?.closest(SKIP)) return;
      // A copy from before a late layout change still beats the menu on the bare image; the next one gets a fresh copy.
      if (ready.key !== keyOf(figure)) prepare(figure).catch(() => {});
      armed = overlayOf(frame);
      if (armed.getAttribute("src") !== ready.url) armed.src = ready.url;
      armed.setAttribute("data-menu", "");
      disarming = window.setTimeout(disarm, 1500);
    },
    { capture: true, signal },
  );
  document.addEventListener("contextmenu", () => setTimeout(disarm), { signal });

  const say = (frame: Element | null, message: string, state: "done" | "failed") => {
    const button = frame?.querySelector(".ca-copy");
    const status = frame?.querySelector(".ca-copy-status");
    if (!button || !status) return;
    button.setAttribute("data-state", state);
    status.textContent = message;
    setTimeout(
      () => {
        if (status.textContent !== message) return;
        button.removeAttribute("data-state");
        status.textContent = "";
      },
      state === "done" ? 1500 : 6000,
    );
  };

  function copy(figure: HTMLElement, frame: Element | null) {
    let failed: unknown;
    // The item takes a promise, so the write starts inside the click or key press, as Safari requires.
    const blob = prepare(figure).then(
      (ready) => ready.blob,
      (error: unknown) => {
        failed = error;
        throw error;
      },
    );
    navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]).then(
      () => say(frame, "Copied", "done"),
      (error: unknown) => {
        const reason = failed ?? error;
        const name = reason instanceof DOMException ? reason.name : "";
        say(
          frame,
          failed && name === "SecurityError"
            ? "The image's server doesn't allow copying it (no CORS)."
            : name === "NotAllowedError" || name === "SecurityError"
              ? "This page can't write to the clipboard. Right-click the image and copy it instead."
              : "Couldn't copy the screenshot.",
          "failed",
        );
      },
    );
  }

  document.addEventListener(
    "click",
    (event) => {
      const button = event.target instanceof Element ? event.target.closest(".ca-copy") : null;
      const figure = figureOf(button);
      if (!button || !figure || !copying) return;
      event.preventDefault();
      copy(figure, button.closest(".ca-frame"));
    },
    { signal },
  );

  // Control or Command+C copies a focused screenshot, or the zoomed one, unless text is selected.
  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key.toLowerCase() !== "c" || !(event.ctrlKey || event.metaKey)) return;
      if (event.altKey || event.shiftKey || !copying || !getSelection()?.isCollapsed) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      const own = target?.matches(".ca-screenshot") && !target.closest(".cz-dialog");
      const figure = own
        ? target
        : target?.matches(".cz-dialog")
          ? figureOf(target.querySelector(".ca-screenshot, .ca-swipe"))
          : null;
      if (!target || !figure) return;
      event.preventDefault();
      copy(figure, (own ? figure : target).querySelector(".ca-frame"));
    },
    { signal },
  );

  const follow = (event: Event) => {
    // SAFETY: comark-zoom's open and change events carry the item shown.
    const { item } = (event as CustomEvent<{ item?: unknown }>).detail ?? {};
    // A screenshot zooms its stage, inside the source that copy paints. Sliders zoom their pair, so use the first
    // side as the screenshot source for the keyboard copy path.
    zoomed =
      item instanceof HTMLElement
        ? (item.closest<HTMLElement>(".ca-screenshot") ??
          (item.matches(".ca-swipe")
            ? item.querySelector<HTMLElement>(".ca-side-before .ca-stage")
            : null))
        : null;
    // Zoom copies the figure as it was, a moment's "Copied" included; a thumbnail is a button and gets no button inside.
    for (const part of document.querySelectorAll(".cz-thumb :is(.ca-copy,.ca-copy-status)"))
      part.remove();
    for (const button of document.querySelectorAll(".cz-dialog .ca-copy[data-state]"))
      button.removeAttribute("data-state");
    for (const status of document.querySelectorAll(".cz-dialog .ca-copy-status"))
      status.textContent = "";
  };
  document.addEventListener("comark-zoom:open", follow, { signal });
  document.addEventListener("comark-zoom:change", follow, { signal });
  document.addEventListener("comark-zoom:close", () => (zoomed = null), { signal });

  const state = {
    users: 1,
    stop: () => {
      if (--state.users > 0) return;
      listeners.abort();
      disarm();
      for (const url of urls) URL.revokeObjectURL(url);
      for (const overlay of document.querySelectorAll(".ca-overlay")) overlay.remove();
      root.removeAttribute("data-annotate-copy");
      root.removeAttribute("data-annotate-ready");
      window.__comarkAnnotate = undefined;
    },
  };
  window.__comarkAnnotate = state;
  return state.stop;
}
