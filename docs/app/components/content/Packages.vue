<script setup lang="ts">
// `::packages`: a canvas with a card for every example, drawn by the plugins as the playground draws it, and the list it
// replaces without a script, for keyboards, and on request. docs/landing.ts renders the cards into
// /canvas-cards.json, and its `:::demo` children add a card for a package with no examples.
//
// The canvas is columns of cards without end, each running through every card from its own start, so neighbours differ
// from column to column. Only the cards in view are in the page, cloned from the fetched cards as they come in, at
// heights known before any is shown. It holds still: it follows a drag and coasts to rest after it, and pans sideways
// with a trackpad.
import landing from "../../../.generated/landing.json";
import { site } from "../../../paths.ts";

type View = "canvas" | "list";

const root = useTemplateRef<HTMLElement>("root");
const viewport = useTemplateRef<HTMLElement>("viewport");
const stage = useTemplateRef<HTMLElement>("stage");
const dots = useTemplateRef<HTMLElement>("dots");
// Unset until the script runs, so the list shows without one; the head script below picks the view before then.
const view = ref<View>();
const ready = ref(false);
const dragged = ref(false);

// Before the first paint, so the list doesn't flash before the canvas.
useHead({
  script: [
    {
      key: "comark-view",
      innerHTML:
        'try{document.documentElement.dataset.comarkView=localStorage.getItem("comark-view")==="list"?"list":"canvas"}catch{document.documentElement.dataset.comarkView="canvas"}',
    },
  ],
});

declare global {
  interface Window {
    comarkCanvasCards?: Promise<string>;
    comarkCardHeights?: number[];
  }
}
// Fetched once per visit, preloaded as the page starts, so the page doesn't parse them before its first paint.
const canvasCards = () =>
  (window.comarkCanvasCards ??= fetch("/canvas-cards.json").then((r) =>
    r.ok ? (r.json() as Promise<string>) : Promise.reject(new Error(String(r.status))),
  ));

const mod = (a: number, n: number) => ((a % n) + n) % n;
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const copyTokens = new WeakMap<Element, number>();
async function copied(button: HTMLElement) {
  const token = (copyTokens.get(button) ?? 0) + 1;
  copyTokens.set(button, token);
  await navigator.clipboard.writeText(button.dataset.copy ?? "");
  if (copyTokens.get(button) !== token) return;
  button.classList.add("copied");
  setTimeout(() => {
    if (copyTokens.get(button) === token) button.classList.remove("copied");
  }, 1200);
}

let setView: (name: View, keep?: boolean) => void = (name) => (view.value = name);
let stop = () => {};

onMounted(async () => {
  const chosen: View = document.documentElement.dataset.comarkView === "list" ? "list" : "canvas";
  let html: string;
  try {
    html = await canvasCards();
  } catch {
    delete window.comarkCanvasCards;
    view.value = "list";
    document.documentElement.dataset.comarkView = "list";
    return;
  }
  const canvas = root.value;
  if (!canvas || !viewport.value || !stage.value || !dots.value) return;
  const [port, board, grid] = [viewport.value, stage.value, dots.value];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const fetched = document.createElement("template");
  fetched.innerHTML = html;
  canvas.prepend(...fetched.content.querySelectorAll("style"));
  const cards = [...fetched.content.children] as HTMLElement[];
  const n = cards.length;
  const gap = 20;
  const pitch = 300 + gap;
  const pad = 160;
  let heights: number[] = [];
  let period = 0;
  // A card is measured off screen at the canvas's first draw, once per visit, so coming back measures nothing. Its
  // images carry their size, so it measures as it will show.
  const measured = (window.comarkCardHeights ??= []);
  const measure = () => {
    const probe = document.createElement("div");
    probe.className = "canvas-probe";
    const unsized = cards.flatMap((c, i) => (c.dataset.h || measured[i] ? [] : [i]));
    const clones = unsized.map((i) => probe.appendChild(cards[i]!.cloneNode(true)) as HTMLElement);
    board.append(probe);
    unsized.forEach((i, j) => (measured[i] = Math.ceil(clones[j]!.getBoundingClientRect().height)));
    probe.remove();
    // A card taller than the tallest the canvas shows is cut, and fades out where it's cut.
    cards.forEach((card, i) => {
      if (card.dataset.h) return;
      card.dataset.h = String(Math.min(420, Math.max(120, measured[i]!)));
      card.style.height = `${card.dataset.h}px`;
      card.toggleAttribute("data-cut", measured[i]! > 420);
    });
    heights = cards.map((c) => Number(c.dataset.h));
    period = heights.reduce((sum, h) => sum + h + gap, 0);
  };
  // Each column starts `step` cards on from the one before, so a card shows again in the columns k over, k*step cards
  // away. The step that keeps those farthest apart over the columns a screen holds keeps copies off one screen.
  const apart = (s: number) =>
    Math.min(
      ...[1, 2, 3, 4, 5, 6].map((k) => {
        const d = mod(k * s, n);
        return Math.min(d, n - d);
      }),
    );
  let step = 1;
  for (let s = 2; s < n; s++) if (gcd(s, n) === 1 && apart(s) > apart(step)) step = s;
  const live = new Map<string, { el: HTMLElement; i: number }>();
  const pools: HTMLElement[][] = cards.map(() => []);
  let x = 0;
  let y = -48;
  let vw = 0;
  let vh = 0;
  let vx = 0;
  let vy = 0;
  let last = 0;
  let frame = 0;
  let down: { id: number; px: number; py: number; x: number; y: number } | undefined;
  let dragging = false;
  let moved = false;
  let samples: [number, number, number][] = [];
  let placed = false;
  const draw = () => {
    if (!vw) return;
    if (!period) measure();
    // Centered on the first column, once there's a width to center in.
    if (!placed) {
      x = -mod(vw - 300, pitch) / 2;
      placed = true;
    }
    board.style.transform = `translate3d(${-x}px,${-y}px,0)`;
    grid.style.transform = `translate3d(${-mod(x, 24)}px,${-mod(y, 24)}px,0)`;
    const seen = new Set<string>();
    for (let c = Math.floor((x - pad) / pitch); c * pitch < x + vw + pad; c++) {
      const start = mod(c * step, n);
      const shift = mod(c, 2) * 140 + mod(c, 3) * 36;
      let top = shift;
      const ys = cards.map((_, j) => {
        const at = top;
        top += heights[(start + j) % n]! + gap;
        return at;
      });
      for (let p = Math.floor((y - pad - shift) / period); p * period + shift < y + vh + pad; p++)
        for (let j = 0; j < n; j++) {
          const i = (start + j) % n;
          const at = p * period + ys[j]!;
          if (at >= y + vh + pad || at + heights[i]! <= y - pad) continue;
          const key = `${c}:${p * n + j}`;
          seen.add(key);
          if (live.has(key)) continue;
          const el = pools[i]!.pop() ?? (cards[i]!.cloneNode(true) as HTMLElement);
          for (const button of el.querySelectorAll(".demo-copy")) {
            button.classList.remove("copied");
            copyTokens.set(button, (copyTokens.get(button) ?? 0) + 1);
          }
          el.style.left = `${c * pitch}px`;
          el.style.top = `${at}px`;
          board.append(el);
          live.set(key, { el, i });
        }
    }
    for (const [key, slot] of live)
      if (!seen.has(key)) {
        slot.el.remove();
        pools[slot.i]!.push(slot.el);
        live.delete(key);
      }
  };
  // A fling's velocity eases to rest, and the loop stops there.
  const tick = (now: number) => {
    const dt = Math.min(64, now - (last || now));
    last = now;
    const k = 1 - Math.exp(-dt / 450);
    vx -= vx * k;
    vy -= vy * k;
    x += vx * dt;
    y += vy * dt;
    draw();
    if (Math.abs(vx) + Math.abs(vy) < 0.003) {
      vx = vy = 0;
      frame = last = 0;
      return;
    }
    frame = requestAnimationFrame(tick);
  };
  const run = () => {
    if (!frame && !dragging && (vx || vy) && view.value === "canvas")
      frame = requestAnimationFrame(tick);
  };
  const halt = () => {
    cancelAnimationFrame(frame);
    frame = last = 0;
  };
  setView = (name, keep) => {
    view.value = name;
    document.documentElement.dataset.comarkView = name;
    if (keep)
      try {
        localStorage.setItem("comark-view", name);
      } catch {}
    if (name === "canvas") {
      // Measured as the view switches, so it draws with the viewport's size before its first paint.
      vw = port.clientWidth;
      vh = port.clientHeight;
      draw();
      run();
    } else halt();
  };
  const resize = new ResizeObserver(([entry]) => {
    vw = entry!.contentRect.width;
    vh = entry!.contentRect.height;
    draw();
  });
  resize.observe(port);
  port.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || (e.target as Element).closest(".demo-copy")) return;
    down = { id: e.pointerId, px: e.clientX, py: e.clientY, x, y };
    moved = false;
    samples = [[e.timeStamp, e.clientX, e.clientY]];
  });
  port.addEventListener("pointermove", (e) => {
    if (!down || e.pointerId !== down.id) return;
    const dx = e.clientX - down.px;
    const dy = e.clientY - down.py;
    if (!dragging) {
      if (Math.hypot(dx, dy) < 5) return;
      dragging = moved = true;
      halt();
      vx = vy = 0;
      port.setPointerCapture(e.pointerId);
      port.dataset.dragging = "";
      dragged.value = true;
    }
    x = down.x - dx;
    y = down.y - dy;
    draw();
    samples.push([e.timeStamp, e.clientX, e.clientY]);
    if (samples.length > 8) samples.shift();
  });
  const release = (e: PointerEvent) => {
    if (!down || e.pointerId !== down.id) return;
    if (dragging) {
      const [t, sx, sy] = samples.find((s) => e.timeStamp - s[0] < 100) ?? samples.at(-1)!;
      const dt = e.timeStamp - t;
      const fling = (v: number) => Math.max(-3, Math.min(3, v));
      if (e.type === "pointerup" && dt > 0 && !reduce.matches) {
        vx = fling((sx - e.clientX) / dt);
        vy = fling((sy - e.clientY) / dt);
      }
      dragging = false;
      delete port.dataset.dragging;
      run();
    }
    down = undefined;
  };
  port.addEventListener("pointerup", release);
  port.addEventListener("pointercancel", (e) => {
    release(e);
    moved = false;
  });
  // A drag that ends on a card isn't a click on it.
  port.addEventListener(
    "click",
    (e) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
        moved = false;
        return;
      }
      const copy = (e.target as Element).closest<HTMLElement>(".demo-copy");
      if (copy) void copied(copy);
    },
    true,
  );
  port.addEventListener("dragstart", (e) => e.preventDefault());
  port.addEventListener("selectstart", (e) => e.preventDefault());
  port.addEventListener(
    "wheel",
    (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      x += e.deltaX * (e.deltaMode ? 16 : 1);
      dragged.value = true;
      draw();
    },
    { passive: false },
  );
  stop = () => {
    halt();
    resize.disconnect();
  };
  ready.value = true;
  await nextTick();
  setView(chosen);
});
onBeforeUnmount(() => stop());

// The canvas is for pointers; a keyboard reaching the list shows it.
const onListFocus = () => {
  if (view.value === "canvas") setView("list");
};
</script>

<template>
  <section
    ref="root"
    class="canvas"
    :data-view="view"
    :data-dragged="dragged ? '' : undefined"
    aria-label="Packages"
  >
    <div ref="viewport" class="canvas-viewport" aria-hidden="true">
      <div ref="dots" class="canvas-dots" />
      <div ref="stage" class="canvas-stage" />
      <p class="canvas-hint">Drag to explore</p>
    </div>
    <ul class="canvas-list" @focusin="onListFocus">
      <li v-for="pkg in landing.packages" :key="pkg.slug">
        <NuxtLink :to="site(`/${pkg.slug}`)">
          <span class="canvas-list-icon">
            <UIcon
              :name="pkg.icon === 'scribble-loop' ? 'i-lucide-pen-tool' : `i-lucide-${pkg.icon}`"
            />
          </span>
          <strong>{{ pkg.label }}</strong>
          <span>{{ pkg.blurb }}</span>
        </NuxtLink>
      </li>
    </ul>
    <div v-if="ready" class="canvas-bar">
      <UFieldGroup aria-label="View" role="group">
        <UButton
          v-for="option in ['canvas', 'list'] as const"
          :key="option"
          :icon="option === 'canvas' ? 'i-lucide-layout-dashboard' : 'i-lucide-rows-2'"
          :aria-label="option === 'canvas' ? 'Canvas' : 'List'"
          :title="option === 'canvas' ? 'Canvas' : 'List'"
          :aria-pressed="view === option"
          :variant="view === option ? 'soft' : 'ghost'"
          color="neutral"
          size="sm"
          @click="setView(option, true)"
        />
      </UFieldGroup>
    </div>
  </section>
</template>

<style>
/* Global, since the cards come in as HTML that the canvas clones; every selector starts at `.canvas`. */
.canvas {
  --canvas: oklch(0.965 0 0);
  --card: #fff;
  --dot: oklch(0.86 0 0);
  position: relative;
  margin: 0 -0.25rem;
}

.dark .canvas {
  --canvas: oklch(0.175 0 0);
  --card: oklch(0.215 0 0);
  --dot: oklch(0.3 0 0);
}

.canvas-viewport {
  position: relative;
  height: clamp(34rem, 80vh, 54rem);
  overflow: hidden;
  border-radius: var(--r-lg);
  background: var(--canvas);
  box-shadow: inset 0 0 0 1px var(--line);
  cursor: grab;
  touch-action: pan-y;
  user-select: none;
  -webkit-user-select: none;
}

.canvas-viewport[data-dragging] {
  cursor: grabbing;
}

/* The edges fade into the page, so the canvas reads as going on. Above the cards, under the bar. */
.canvas-viewport::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: inherit;
  background:
    linear-gradient(var(--canvas), transparent 4.5rem calc(100% - 7rem), var(--canvas)),
    linear-gradient(90deg, var(--canvas), transparent 4rem calc(100% - 4rem), var(--canvas));
  pointer-events: none;
}

.canvas-dots {
  position: absolute;
  inset: -24px;
  background: radial-gradient(circle, var(--dot) 1px, transparent 1.5px) 0 0 / 24px 24px;
  will-change: transform;
}

.canvas-stage {
  position: absolute;
  inset: 0 auto auto 0;
  will-change: transform;
}

.canvas-hint {
  position: absolute;
  left: 50%;
  top: 1.25rem;
  z-index: 2;
  margin: 0;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  background: var(--bg);
  box-shadow: 0 0 0 1px var(--line);
  color: var(--muted);
  font: 500 0.75rem/1.5 var(--mono);
  translate: -50% 0;
  pointer-events: none;
  transition:
    opacity 300ms ease,
    translate 300ms var(--ease-out);
}

.canvas[data-dragged] .canvas-hint {
  opacity: 0;
  translate: -50% -0.5rem;
}

.canvas-bar {
  position: absolute;
  left: 50%;
  bottom: 1rem;
  z-index: 2;
  display: flex;
  padding: 0.25rem;
  border-radius: var(--r-md);
  background: var(--bg);
  box-shadow: 0 0 0 1px var(--line);
  translate: -50% 0;
}

/* The list until the script picks the canvas: then the head script's choice, then the component's. */
.canvas:not([data-view]) .canvas-viewport,
.canvas[data-view="list"] .canvas-viewport {
  display: none;
}

:root[data-comark-view="canvas"] .canvas:not([data-view]) .canvas-viewport {
  display: block;
}

/* In the canvas, the list stays for screen readers and keyboards; reaching it switches to it. */
.canvas[data-view="canvas"] .canvas-list,
:root[data-comark-view="canvas"] .canvas:not([data-view]) .canvas-list {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

/* The list's bar sits under it, in the page rather than over the canvas. */
.canvas[data-view="list"] .canvas-bar {
  position: static;
  width: fit-content;
  margin: 1.5rem auto 0;
  padding: 0;
  background: none;
  box-shadow: none;
  translate: none;
}

/* The packages as a list: tiles sharing their borders, each one a link. */
.canvas .canvas-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  width: var(--column);
  margin: 0 auto;
  padding: 0;
  overflow: hidden;
  border-radius: var(--r-lg);
  box-shadow: 0 0 0 1px var(--line);
  list-style: none;
}

.canvas .canvas-list li {
  display: flex;
  margin: 0;
  padding: 0;
  box-shadow:
    1px 0 0 var(--line),
    0 1px 0 var(--line);
}

.canvas .canvas-list a {
  display: grid;
  flex: 1;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.125rem 0.875rem;
  align-items: center;
  padding: 1.25rem 1.25rem 1.25rem 1rem;
  border: 0;
  color: var(--muted);
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.5;
  text-decoration: none;
  transition: background-color 150ms ease;
}

.canvas-list-icon {
  display: grid;
  grid-row: span 2;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--r-md);
  background: var(--soft);
  color: var(--fg);
  font-size: 1.25rem;
  transition: background-color 150ms ease;
}

.canvas-list strong {
  grid-column: 2;
  color: var(--fg);
  font: 500 0.875rem/1.4 var(--mono);
}

.canvas-list a > span:not([class]) {
  grid-column: 2;
  text-wrap: pretty;
}

.canvas-list a:focus-visible {
  outline: 2px solid var(--fg);
  outline-offset: -2px;
}

@media (hover: hover) {
  .canvas-list a:hover {
    background: var(--soft);
  }

  .canvas-list a:hover .canvas-list-icon {
    background: var(--bg);
  }
}

/* A card: its package over what the plugins drew, on the card itself. The link covers it. */
.canvas .demo {
  position: absolute;
  display: flex;
  flex-direction: column;
  width: 300px;
  padding: 0 6px 6px;
  border-radius: var(--r-lg);
  background: var(--card);
  box-shadow: 0 0 0 1px var(--line);
  /* Its size is in its markup, so adding a card to the stage lays out and paints that card alone. */
  contain: strict;
}

/* Cards without a height are measured once in here, at their content's height. */
.canvas-probe {
  position: absolute;
  width: 300px;
  visibility: hidden;
  pointer-events: none;
}

.canvas .canvas-probe .demo {
  position: relative;
  height: auto;
  contain: none;
}

.canvas .demo-link {
  display: flex;
  flex: none;
  align-items: center;
  gap: 0.5rem;
  height: 2.5rem;
  padding: 0 2.75rem 0 0.5rem;
  color: var(--fg);
  font: 500 0.8125rem/1 var(--mono);
  text-decoration: none;
  -webkit-user-drag: none;
}

.canvas .demo-link .ci {
  color: var(--faint);
}

/* The package's name stays whole; the example's label gives way. */
.canvas .demo-link strong {
  flex: none;
  white-space: nowrap;
}

.canvas .demo-link span {
  min-width: 0;
  overflow: hidden;
  color: var(--faint);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.canvas .demo-link::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
}

/* The canvas holds still under the pointer: only the copy button answers it, and only with its color. */
.canvas .demo-copy {
  position: absolute;
  top: 0.25rem;
  right: 0.375rem;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border: 0;
  border-radius: var(--r-sm);
  background: none;
  color: var(--faint);
  cursor: pointer;
}

.canvas .demo-copy svg {
  grid-area: 1 / 1;
  transition:
    opacity 200ms cubic-bezier(0.2, 0, 0, 1),
    scale 200ms cubic-bezier(0.2, 0, 0, 1),
    filter 200ms cubic-bezier(0.2, 0, 0, 1);
}

.canvas .demo-copy .check,
.canvas .demo-copy.copied svg:first-child {
  opacity: 0;
  scale: 0.25;
  filter: blur(4px);
}

.canvas .demo-copy.copied .check {
  opacity: 1;
  scale: 1;
  filter: none;
  color: #16a34a;
}

.canvas .demo-copy:hover {
  background: var(--soft);
  color: var(--fg);
}

.canvas .demo[data-cut] .demo-screen {
  mask-image: linear-gradient(#000 calc(100% - 3rem), transparent);
}

.canvas .demo-screen {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  border-radius: var(--r-md);
  pointer-events: none;
}

/* The plugins' output at a page's type, zoomed to the card, so it wraps as it would at that size. It starts where the
   card's name does. Plain HTML, so it gets the reading styles a page would give it. */
.canvas .demo-page {
  padding: 0.25rem 0.625rem 0.75rem;
  color: var(--ui-text);
  font-size: 0.9375rem;
  line-height: 1.6;
  zoom: var(--z, 0.82);
}

.canvas .demo-page :is(p, ul, ol, table, blockquote, pre, figure) {
  margin: 0 0 0.75rem;
}

.canvas .demo-page :is(ul, ol) {
  padding-left: 1.25rem;
}

.canvas .demo-page ul {
  list-style: disc;
}

.canvas .demo-page ol {
  list-style: decimal;
}

.canvas .demo-page a {
  color: var(--fg);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.canvas .demo-page :not(pre) > code {
  padding: 0.0625rem 0.3125rem;
  border-radius: 4px;
  background: var(--soft);
  font: 0.85em var(--mono);
}

.canvas .demo-page pre {
  padding: 0.75rem;
  border-radius: var(--r-sm);
  background: var(--soft);
  font: 0.8125rem/1.6 var(--mono);
}

.canvas .demo-page table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.canvas .demo-page :is(th, td) {
  padding: 0.375rem 0.5rem;
  border-bottom: 1px solid var(--line);
  text-align: left;
}

.canvas .demo-page th {
  color: var(--fg);
  font-weight: 600;
}

.canvas .demo-page :is(strong, b) {
  color: var(--fg);
  font-weight: 600;
}

.canvas .demo-page > :first-child,
.canvas .demo-page > :first-child > :first-child {
  margin-top: 0;
}

.canvas .demo-page > :last-child {
  margin-bottom: 0;
}

/* Headings at a card's size, not the landing's. */
.canvas .demo-page :is(h1, h2, h3, h4) {
  margin: 0 0 0.5rem;
  padding: 0;
  border: 0;
  color: var(--fg);
  font: 600 1.0625rem/1.35 var(--sans);
  letter-spacing: -0.01em;
}

.canvas .demo-page img {
  -webkit-user-drag: none;
}

/* The page's own buttons do nothing on a card. */
.canvas .demo-page :is(.ca-copy, .ca-copy-status, .cmm-bar) {
  display: none;
}

/* The card is the frame, so a block that draws its own drops it when it's all the card shows. */
.canvas
  .demo-page
  > :is(
    .cch,
    .cd,
    .ce,
    .ce-card,
    .cgc,
    .ck,
    .cft,
    .ct,
    .cmv,
    .cc,
    .ccr,
    .ccr-group,
    .cdg,
    .cmm,
    .cca,
    .cdt,
    .cdt-accordion,
    .ctr,
    .cfm,
    .cmt-tiles,
    .cqz
  ):only-child {
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: none;
  box-shadow: none;
}

/* A Mermaid diagram's card is inside its wrapper, which holds the buttons. */
.canvas .demo-page > .cmm:only-child > .pele-diagram {
  padding: 0;
  border: 0;
  border-radius: 0;
  background: none;
}

.canvas .demo-page .cch {
  --cch-padding: 0;
  padding: 0;
}

.canvas .demo-page > .cft:only-child {
  padding: 0;
}

.canvas .demo-page .cd figcaption {
  padding-inline: 0;
  background: none;
}

/* A chart's plot is drawn at a page's width; the card's is narrower. */
.canvas .demo-page svg.marks {
  max-width: 100%;
  height: auto;
}

/* A card is a still of the page as rendered: the plugins' own entrances and transitions don't run in it. */
.canvas .demo-page *,
.canvas .demo-page *::before,
.canvas .demo-page *::after {
  animation: none !important;
  transition: none !important;
}

/* A selection would only fight the drag. */
.canvas-viewport * {
  user-select: none;
  -webkit-user-select: none;
}

.canvas .demo-diff {
  --z: 0.72;
}

.canvas .demo-charts {
  --z: 0.62;
}

/* zoom: the image fills its card. */
.canvas .demo-zoom .demo-page {
  display: grid;
  place-items: center;
  height: 100%;
}

.canvas .demo-zoom p {
  width: 100%;
  margin: 0;
}

.canvas .demo-zoom img {
  display: block;
  max-width: 100%;
  border-radius: var(--r-sm);
}

/* carousel: a still has no count to keep. */
.canvas .demo-carousel .cc-count {
  visibility: hidden;
}

/* code: a still shows the bar its script would. */
.canvas :is(.demo-code, .demo-include) .ck-bar {
  opacity: 1;
}

/* A card is too narrow to scroll, so its code wraps. */
.canvas .demo-page pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

/* include: the directive, then what it reads. */
.canvas .demo-directive {
  margin: 0 0 0.875rem;
  padding: 0.5rem 0.625rem;
  border-radius: var(--r-sm);
  background: var(--soft);
  box-shadow: inset 0 0 0 1px var(--line);
  font-size: 0.8125rem;
}

.canvas .demo-directive code {
  padding: 0;
  background: none;
  overflow-wrap: anywhere;
}

/* embed: a still of the player, playing. The still fills whatever frame the embed's size gives it. */
.canvas .demo-page .ce-frame:has(.demo-player) {
  aspect-ratio: 16 / 9;
  height: auto;
}

.canvas .demo-player {
  position: relative;
  display: grid;
  place-items: center;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: oklch(0.22 0 0);
}

.canvas .demo-play {
  display: grid;
  place-items: center;
  width: 3.25rem;
  height: 2.25rem;
  padding-left: 2px;
  border-radius: var(--r-md);
  background: #e5484d;
  color: #fff;
}

/* lint: comark-lint's report, a line at a time, as a terminal prints it. */
.canvas .demo-lint {
  --z: 0.78;
}

.canvas .demo-lint .demo-screen {
  background: oklch(0.17 0 0);
}

.canvas .term {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  color: oklch(0.82 0 0);
  font: 0.8125rem/1.55 var(--mono);
}

.canvas .term-line {
  display: block;
}

.canvas .term-cmd {
  color: oklch(0.96 0 0);
}

.canvas .term-cmd span {
  color: #16a34a;
}

.canvas .term-where {
  margin-top: 0.5rem;
  color: oklch(0.65 0 0);
}

.canvas .term-where span {
  color: #f5a524;
}

.canvas .term-message code {
  padding: 0;
  background: none;
  color: oklch(0.96 0 0);
}

.canvas .term-sum {
  display: block;
  margin-top: 0.5rem;
  color: #e5484d;
  font-weight: 600;
}

@media (max-width: 60rem) {
  .canvas {
    margin: 0 -1rem;
  }

  .canvas .canvas-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .canvas-viewport {
    height: clamp(30rem, 72vh, 40rem);
    border-radius: 0;
    box-shadow:
      inset 0 1px 0 var(--line),
      inset 0 -1px 0 var(--line);
  }
}

@media (max-width: 36rem) {
  .canvas .canvas-list {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
