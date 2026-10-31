import type { NodeHandler, State } from "comark";
import { resolveAttributes } from "comark/render";
import { runtime as zoomRuntime } from "comark-zoom/html";
import { start } from "./client.ts";
import { css } from "./styles.ts";
import { scalar } from "../../../shared/text.ts";
import { attr } from "../../../shared/html.ts";

export { default } from "./index.ts";
export type { CarouselMeta } from "./index.ts";

// Each render gets a fresh `state.context`, so a document carries the script once.
const started = new WeakSet<object>();

/** The carousel script as one inline `<script>`, once per render. */
export function runtime(state: State): string {
  if (started.has(state.context)) return "";
  started.add(state.context);
  // The styles come inline before the script, so the script has nothing to add.
  return `<style data-comark-carousel>${css}</style><script>(${start.toString()})("")</script>`;
}

const off = (value: unknown) => value === false || value === "false";
const chevron = (path: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;

export interface CarouselOptions {
  /** How many slides show at once on a wide page: 1 to 3. Default `1`. */
  columns?: number | string;
  /** Name read out by screen readers. Default `Carousel`. */
  title?: string;
  /** Group the zoomable items inside the carousel, so the zoomed view pages through them. Default `true`. */
  zoom?: boolean;
}

function shell(count: number, options: CarouselOptions, track: string, state: State) {
  const columns = Math.min(3, Math.max(1, Number(options.columns) || 1));
  const zoom = options.zoom ?? true;
  const controls =
    count > 1
      ? `<div class="cc-controls"><span class="cc-count" aria-live="polite">1 / ${count}</span><div class="cc-steps">` +
        `<button type="button" class="cc-step" data-carousel-step="-1" aria-label="Previous slide" aria-disabled="true">${chevron("m15 18-6-6 6-6")}</button>` +
        `<button type="button" class="cc-step" data-carousel-step="1" aria-label="Next slide">${chevron("m9 18 6-6-6-6")}</button></div></div>`
      : "";
  return (
    `<div class="cc"${columns > 1 ? ` data-carousel-columns="${columns}"` : ""}${count <= columns ? " data-carousel-fits" : ""}${zoom ? " data-zoom-gallery" : ""} role="region" aria-roledescription="carousel" aria-label="${attr(options.title ?? "Carousel")}">` +
    `<div class="cc-track">${track}</div>${controls}</div>${zoom ? zoomRuntime(state) : ""}${runtime(state)}`
  );
}

/**
 * A carousel around slides that are already HTML, for plugins that build their own slides and decide what zooms
 * inside them. Adds the scripts once per render.
 */
export function carouselHtml(slides: string[], options: CarouselOptions, state: State): string {
  const track = slides
    .map(
      (slide, index) =>
        `<div class="cc-slide" role="group" aria-roledescription="slide" aria-label="${index + 1} of ${slides.length}">${slide}</div>`,
    )
    .join("");
  return shell(slides.length, options, track, state);
}

// `:bound` props resolve the way Comark's Vue, React, and Svelte renderers resolve them, so all four agree.
const props = (attrs: Record<string, unknown>, state: State) =>
  resolveAttributes(attrs, state.renderData, { parseJson: true });

const carousel: NodeHandler = async ([, attrs, ...children], state) => {
  const { count, columns, title, zoom } = props(attrs, state);
  return shell(
    Number(count) || 0,
    { columns: scalar(columns), title: scalar(title), zoom: !off(zoom) },
    await state.flow(["div", {}, ...children], state),
    state,
  );
};

const slide: NodeHandler = async ([, attrs, ...children], state) => {
  const { index, count, title, zoom } = props(attrs, state);
  const name = scalar(title);
  const zoomable = !off(zoom);
  return `<div class="cc-slide" role="group" aria-roledescription="slide" aria-label="${attr(`${scalar(index) ?? ""} of ${scalar(count) ?? ""}`)}"${zoomable ? ` data-zoom tabindex="0"${name === undefined ? "" : ` data-zoom-title="${attr(name)}"`}` : ""}>${await state.flow(["div", {}, ...children], state)}</div>`;
};

/** HTML renderers for `::carousel` and `:::slide`. Pass them as `components`. */
export const components: Record<"carousel" | "slide", NodeHandler> = { carousel, slide };
