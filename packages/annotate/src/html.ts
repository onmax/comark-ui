import type { ElementNode, Node, NodeHandler, State } from "comark";
import { escapeHtml, textContent } from "comark/utils";
import { carouselHtml } from "comark-carousel/html";
import { runtime as zoomRuntime } from "comark-zoom/html";
import { measure } from "comark-zoom/size";
import { start } from "./script.ts";
import { draw } from "./marks.ts";
import { BOX_PADDING, pixels, place } from "./place.ts";
import {
  type Annotation,
  noteAt,
  PALETTE,
  readCompare,
  readScreenshot,
  type Screenshot,
  target,
} from "./read.ts";
import { css } from "./styles.ts";

export { default } from "./index.ts";
export type { AnnotateMeta, AnnotateOptions, Annotation, Mark } from "./index.ts";

// Each render gets a fresh `state.context`: the first figure in a document carries the styles, and ids are
// counted per render.
const styled = new WeakSet<object>();
const counts = new WeakMap<object, Map<number, number>>();
function styles(state: State) {
  if (styled.has(state.context)) return "";
  styled.add(state.context);
  return `<style>${css}</style>`;
}

// Each render gets a fresh `state.context`, so a document carries the script for sliders and copying once.
const started = new WeakSet<object>();
function runtime(state: State) {
  if (started.has(state.context)) return "";
  started.add(state.context);
  return `<script>(${start.toString()})()</script>`;
}

// Ids come from the images and their order, so they stay stable across renders and don't collide with a
// heading's id or with another document on the same page.
function idFor(shots: Screenshot[], state: State) {
  let hash = 2166136261;
  for (const char of shots.map((shot) => shot.src).join("|"))
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  const seen = counts.get(state.context) ?? new Map<number, number>();
  counts.set(state.context, seen);
  const count = (seen.get(hash) ?? 0) + 1;
  seen.set(hash, count);
  return `ca-${(hash >>> 0).toString(36)}${count > 1 ? `-${count}` : ""}`;
}

const named = new Set<string>(PALETTE);
// The stamp's number takes whichever of white or the dark ink contrasts more with a hex color, by WCAG luminance.
// read.ts only lets 3- and 6-digit hex through.
function ink(hex: string) {
  const full = hex.length === 4 ? hex.replaceAll(/[\da-f]/gi, (digit) => digit + digit) : hex;
  const [r, g, b] = [1, 3, 5].map((at) => {
    const channel = Number.parseInt(full.slice(at, at + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  return 1.05 / (luminance + 0.05) >= (luminance + 0.05) / 0.0605 ? "#fff" : "#1c1917";
}
const paint = (color?: string) =>
  !color
    ? ""
    : named.has(color)
      ? `--ca-color:var(--ca-${color});--ca-solid:var(--ca-${color}-solid);--ca-ink:var(--ca-${color}-ink);`
      : `--ca-color:${color};--ca-solid:${color};--ca-ink:${ink(color)};`;

// A loose hand-drawn stroke that stretches between the mark and its note, and a head that keeps its size.
const ARROW = `<svg class="ca-arrow-line" viewBox="0 0 100 20" preserveAspectRatio="none"><path d="M2 10C30 3 62 17 98 9" vector-effect="non-scaling-stroke"/></svg>`;
const HEAD = `<svg class="ca-arrow-head" viewBox="0 0 12 12"><path d="M8.5 1.5Q5 5 1 6Q5 7 8.5 10.5" vector-effect="non-scaling-stroke"/></svg>`;
// The same stroke falling from a note above the image, with its head pointing down.
const ARROW_DOWN = `<svg class="ca-arrow-line" viewBox="0 0 24 100" preserveAspectRatio="none"><path d="M17 2C2 26 3 66 12 98" vector-effect="non-scaling-stroke"/></svg>`;
// Shown once the script starts and the browser can write images to the clipboard; a check replaces the icon once it has.
const COPY =
  `<button type="button" class="ca-copy" aria-label="Copy the screenshot with its marks" title="Copy with marks">` +
  `<svg class="ca-copy-idle" viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>` +
  `<svg class="ca-copy-done" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg></button>` +
  `<span class="ca-copy-status" role="status"></span>`;
const HEAD_DOWN = `<svg class="ca-arrow-head" viewBox="0 0 12 12"><path d="M1.5 3.5Q5 7 6 11Q7 7 10.5 3.5" vector-effect="non-scaling-stroke"/></svg>`;
// And rising from a note below it.
const ARROW_UP = `<svg class="ca-arrow-line" viewBox="0 0 24 100" preserveAspectRatio="none"><path d="M17 98C2 74 3 34 12 2" vector-effect="non-scaling-stroke"/></svg>`;
const HEAD_UP = `<svg class="ca-arrow-head" viewBox="0 0 12 12"><path d="M1.5 8.5Q5 5 6 1Q7 5 10.5 8.5" vector-effect="non-scaling-stroke"/></svg>`;

// A note set off to one side of where its arrow lands gets a leader after AnnotationKit's: it leaves the note level
// and sweeps into the point. The curve fills a box between the two, stretched to any size, so it starts and ends square
// to the box's sides and each head can be a fixed shape on a corner. A head's tip is at (6, 11) pointing down, (6, 1)
// up, (1, 6) left, and (11, 6) right, so each corner offset puts the tip on the corner.
const curve = (d: string) =>
  `<svg class="ca-arrow-line" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="${d}" vector-effect="non-scaling-stroke"/></svg>`;
const tip = (svg: string, css: string) =>
  svg.replace('class="ca-arrow-head"', `class="ca-arrow-head" style="${css}"`);
const HEAD_RIGHT = `<svg class="ca-arrow-head" viewBox="0 0 12 12"><path d="M3.5 1.5Q7 5 11 6Q7 7 3.5 10.5" vector-effect="non-scaling-stroke"/></svg>`;
// Closer than this, in percent of the image, the note sits straight over or beside its point and the arrow runs straight.
const LEVEL = 2;

const attr = (value: string) => escapeHtml(value, { '"': "&quot;" });
const wrap = (nodes: Node[]): ElementNode => ["div", {}, ...nodes];
const children = (nodes: Node[], state: State) => state.flow(wrap(nodes), state);
// Comark restores shared render state after each node, so notes render one at a time to keep the output deterministic.
async function each<T>(items: T[], render: (item: T) => Promise<string>) {
  let html = "";
  for (const item of items) html += await render(item);
  return html;
}
// The link reads as the host it points at; `href` is already checked to be http or https.
function host(href: string) {
  try {
    return new URL(href).host || "Preview";
  } catch {
    return "Preview";
  }
}
const noteText = (annotation: Annotation) =>
  textContent(wrap(annotation.note)).trim().slice(0, 120);
const label = (annotation: Annotation) =>
  annotation.number ? `Annotation ${annotation.number}` : `Side note: ${noteText(annotation)}`;

// Each mark wobbles by its own number and box, so marks differ from each other but not between renders.
function seed({ n, x, y, w, h, mark }: Annotation) {
  let hash = 2166136261;
  for (const char of `${mark}|${n}|${x}|${y}|${w}|${h}`)
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash;
}

function markSvg(annotation: Annotation, aspect?: number) {
  const { w, h } = pixels(annotation, aspect);
  const { viewBox, paths } = draw(annotation.mark, w, h, seed(annotation), annotation.side);
  const keep = annotation.mark === "check" || annotation.mark === "cross";
  return `<svg viewBox="${viewBox}"${keep ? "" : ' preserveAspectRatio="none"'} aria-hidden="true">${paths.map((d) => `<path d="${d}" vector-effect="non-scaling-stroke"/>`).join("")}</svg>`;
}

// The pieces of a screenshot, which a figure stacks and a slider lays over each other.
async function parts(
  shot: Screenshot,
  state: State,
  id: string,
  copy = false,
  body?: string,
  boxPadding = BOX_PADDING,
) {
  const color = (annotation: Annotation) => paint(annotation.color);
  const style = (annotation: Annotation) =>
    annotation.color ? ` style="${color(annotation)}"` : "";
  // Side notes get letters that only show when the notes stack under the image and the arrows are gone.
  const letters = new Map(
    shot.annotations
      .filter((annotation) => annotation.side)
      .map((annotation, index) => [annotation.n, String.fromCharCode(65 + (index % 26))]),
  );
  const letter = (annotation: Annotation) =>
    `<span class="ca-stamp ca-letter">${letters.get(annotation.n) ?? ""}</span>`;
  const stamp = (annotation: Annotation) =>
    annotation.number
      ? `<span class="ca-stamp">${annotation.number}</span>`
      : annotation.side
        ? letter(annotation)
        : "";
  // The number sits outside a corner of its mark so it never covers what the mark points at, and picks a corner that
  // keeps it off the other numbers and marks.
  const corners = place(shot.annotations, shot.aspect, boxPadding).css;
  const padding =
    boxPadding === BOX_PADDING ? "" : `;padding:${boxPadding}px;margin:${-boxPadding}px`;
  const pinned = (annotation: Annotation) => {
    const css = corners.get(annotation.n);
    return css ? stamp(annotation).replace('">', `" style="${css}">`) : stamp(annotation);
  };
  // Marks aren't links: a click anywhere on the screenshot zooms it, notes included. Hovering a mark still lights up its note.
  const pins = shot.annotations.map(
    (annotation) =>
      `<span class="ca-mark ca-${annotation.mark}" data-n="${annotation.n}" role="img" aria-label="${attr(annotation.number ? `${label(annotation)}: ${noteText(annotation)}` : label(annotation))}" title="${attr(noteText(annotation))}" ` +
      `style="${color(annotation)}left:${annotation.x}%;top:${annotation.y}%;width:${annotation.w}%;height:${annotation.h}%${annotation.mark === "box" ? padding : ""}">` +
      `${markSvg(annotation, shot.aspect)}${pinned(annotation)}</span>`,
  );
  const listed = shot.annotations.filter((annotation) => !annotation.side);
  const notes = await each(
    listed,
    async (annotation) =>
      `<li id="${id}-${annotation.n}" data-n="${annotation.n}"${style(annotation)}>${stamp(annotation)}` +
      `<div>${await children(annotation.note, state)}</div></li>`,
  );
  const sided = shot.annotations.filter((annotation) => annotation.side);
  // Whether a note sits off to one side of its point, and which way its leader runs from it.
  const offset = (annotation: Annotation) => {
    const along = noteAt(annotation);
    const point = target(annotation);
    const level = annotation.side === "left" || annotation.side === "right" ? point.y : point.x;
    return Math.abs(along - level) < LEVEL ? undefined : along > level ? "back" : "on";
  };
  const arrows = sided.map((annotation) => {
    const { x, y } = target(annotation);
    const along = noteAt(annotation);
    const way = offset(annotation);
    const side = annotation.side!;
    let place: string;
    let line: string;
    let head: string;
    if (!way) {
      place =
        side === "top"
          ? `left:${x}%;top:calc(-1 * var(--ca-gap));bottom:${100 - y}%`
          : side === "bottom"
            ? `left:${x}%;top:${y}%;bottom:calc(-1 * var(--ca-gap))`
            : side === "right"
              ? `top:${y}%;left:${x}%;right:calc(-1 * var(--ca-gap))`
              : `top:${y}%;left:calc(-1 * var(--ca-gap));right:${100 - x}%`;
      [line, head] =
        side === "top"
          ? [ARROW_DOWN, HEAD_DOWN]
          : side === "bottom"
            ? [ARROW_UP, HEAD_UP]
            : [ARROW, HEAD];
    } else if (side === "top" || side === "bottom") {
      // "back": the point lies before the note, so the leader runs back toward the left from the note's start.
      const [from, to] = way === "back" ? [100, 0] : [0, 100];
      const [left, right] = way === "back" ? [x, along] : [along, x];
      const corner = way === "back" ? "left:-6px" : "right:-6px";
      if (side === "top") {
        place = `left:${left}%;right:${100 - right}%;top:calc(-1 * var(--ca-lead));bottom:${100 - y}%`;
        line = curve(`M${from} 0C${from + (to - from) * 0.45} 0 ${to} 20 ${to} 100`);
        head = tip(HEAD_DOWN, `${corner};bottom:-1px`);
      } else {
        place = `left:${left}%;right:${100 - right}%;top:${y}%;bottom:calc(-1 * var(--ca-lead))`;
        line = curve(`M${from} 100C${from + (to - from) * 0.45} 100 ${to} 80 ${to} 0`);
        head = tip(HEAD_UP, `${corner};top:-1px`);
      }
    } else {
      // "back": the point lies above the note, so the leader rises from it.
      const [from, to] = way === "back" ? [100, 0] : [0, 100];
      const [top, bottom] = way === "back" ? [y, along] : [along, y];
      const corner = way === "back" ? "top:-6px" : "bottom:-6px";
      const span = `top:${top}%;bottom:${100 - bottom}%`;
      if (side === "right") {
        place = `${span};left:${x}%;right:calc(-1 * var(--ca-gap))`;
        line = curve(`M100 ${from}C40 ${from} 60 ${to} 0 ${to}`);
        head = tip(HEAD, `${corner};left:-1px`);
      } else {
        place = `${span};left:calc(-1 * var(--ca-gap));right:${100 - x}%`;
        line = curve(`M0 ${from}C60 ${from} 40 ${to} 100 ${to}`);
        head = tip(HEAD_RIGHT, `${corner};right:-1px`);
      }
    }
    const reach = annotation.to || annotation.mark === "none" ? " ca-reach" : "";
    return `<span class="ca-arrow ca-arrow-${side}${way ? " ca-curve" : ""}${reach}" data-n="${annotation.n}" style="${color(annotation)}${place}" aria-hidden="true">${line}${head}</span>`;
  });
  // Side notes live outside the frame so the frame, and every percentage inside it, stays the size of the image.
  // A note's x or y is a share of the frame, which sits between the gutters for notes beside, above, and below it.
  const callouts = await each(sided, async (annotation) => {
    const along = noteAt(annotation);
    const way = offset(annotation);
    const across = annotation.side === "top" || annotation.side === "bottom";
    const place = across
      ? `left:calc(var(--ca-pl,0px) + (100% - var(--ca-pl,0px) - var(--ca-pr,0px)) * ${along / 100})`
      : `top:calc(var(--ca-pt,0px) + (100% - var(--ca-pt,0px) - var(--ca-pb,0px)) * ${along / 100})`;
    // A note off to one side of its point starts where its leader does and reads away from it: rightward when the
    // point lies to its left.
    const reads = across && way ? ` ca-callout-${way === "back" ? "east" : "west"}` : "";
    return (
      `<div class="ca-callout ca-callout-${annotation.side}${reads}" id="${id}-${annotation.n}" data-n="${annotation.n}" style="${color(annotation)}${place}">` +
      `${letter(annotation)}<div>${await children(annotation.note, state)}</div></div>`
    );
  });
  const heading = [
    shot.title && `<span class="ca-label">${escapeHtml(shot.title)}</span>`,
    shot.href &&
      `<a href="${attr(shot.href)}" title="${attr(shot.href)}">${escapeHtml(host(shot.href))}</a>`,
  ]
    .filter(Boolean)
    .join(" ");
  const caption = shot.caption.some((node) => Array.isArray(node) || node.trim() !== "")
    ? await children(shot.caption, state)
    : "";
  // The page keeps the image's room before it loads: its capture size, or the size read from the file.
  const size = body
    ? undefined
    : (shot.viewport ??
      (state.renderData.meta.annotateSize !== false
        ? await measure(shot.src, { remote: state.renderData.meta.annotateSize === true })
        : undefined));
  const sized = size ? ` width="${size.width}" height="${size.height}"` : "";
  return {
    sides: sided.map((annotation) => ` ca-${annotation.side}`),
    heading: heading && `<div class="ca-heading">${heading}</div>`,
    frame: `<div class="ca-frame">${body ?? `<img src="${attr(shot.src)}" alt="${attr(shot.alt)}"${sized} loading="lazy" decoding="async">`}${pins.join("")}${arrows.join("")}${copy ? COPY : ""}</div>`,
    callouts,
    notes: caption || notes ? `${caption}${notes ? `<ol class="ca-notes">${notes}</ol>` : ""}` : "",
  };
}

// `margins` reserves room for notes above and below the image, so every image in a comparison sits at the same height.
async function figure(
  shot: Screenshot,
  state: State,
  id: string,
  margins: readonly ("top" | "bottom")[] = [],
  body?: string,
  zoomContext?: string,
  boxPadding = BOX_PADDING,
) {
  // Copying draws the image and its marks to a canvas, which only works for an image.
  const { sides, heading, frame, callouts, notes } = await parts(
    shot,
    state,
    id,
    !body,
    body,
    boxPadding,
  );
  const classes = [...new Set([...sides, ...margins.map((side) => ` ca-${side}`)])].join("");
  return (
    `<figure class="ca-screenshot${classes}">${heading}<div class="ca-stage" data-zoom tabindex="0" data-zoom-context=".ca,.ca-screenshot${zoomContext ? `,${zoomContext}` : ""}" data-zoom-aside="figcaption" data-zoom-title="${attr(shot.title || shot.alt)}">${frame}${callouts}</div>` +
    (notes ? `<figcaption>${notes}</figcaption>` : "") +
    "</figure>"
  );
}

const GRIP = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${[5, 12, 19].map((y) => `<circle cx="9" cy="${y}" r="1.5"/><circle cx="15" cy="${y}" r="1.5"/>`).join("")}</svg>`;

// Without the script the two screenshots stack, each under its title. The script lays them over each other and lets
// the reader drag the divider; the notes stay under the pair, and beside it when zoomed.
async function slider(title: string | undefined, shots: Screenshot[], state: State, id: string) {
  const names = shots.map((shot) => shot.title || shot.alt);
  let sides = "";
  let notes = "";
  for (const [index, shot] of shots.entries()) {
    const part = await parts(shot, state, id);
    const which = index ? "after" : "before";
    sides += `<div class="ca-side ca-side-${which}">${part.heading}<div class="ca-stage">${part.frame}</div></div>`;
    if (part.notes)
      notes += `<div class="ca-side-notes ca-notes-${which}">${shot.title ? `<div class="ca-heading"><span class="ca-label">${escapeHtml(shot.title)}</span></div>` : ""}${part.notes}</div>`;
  }
  const handle =
    `<div class="ca-handle" role="slider" tabindex="0" aria-label="${attr(`Divider between ${names.join(" and ")}`)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50" aria-valuetext="${attr(`${names[0]} 50%, ${names[1]} 50%`)}">` +
    `<span class="ca-grip">${GRIP}</span></div>`;
  return (
    `<div class="ca ca-compare ca-slider" data-wide><div class="ca-swipe" data-zoom tabindex="0" data-zoom-context=".ca"${notes ? ' data-zoom-aside=".ca-swipe-notes"' : ""} data-zoom-title="${attr(title ?? names.join(" / "))}">${sides}${shots.length === 2 ? handle : ""}</div>` +
    `${notes && `<div class="ca-swipe-notes">${notes}</div>`}</div>${zoomRuntime(state)}${runtime(state)}`
  );
}

/**
 * Draws annotations over any HTML the way a screenshot draws them over its image: hand-drawn marks, numbered notes
 * under it, side notes with arrows, and zoom. Each annotation's box is a percentage of `body`'s box, and `label` names
 * the figure for screen readers and the zoomed view. comark-charts draws its marks with it.
 * `boxPadding` is the CSS-pixel clearance used for both box rendering and stamp placement; charts pass zero because
 * their annotation areas already include clearance around the plotted shape.
 */
export async function annotateHtml(
  body: string,
  annotations: Annotation[],
  label: string,
  state: State,
  zoomContext?: string,
  aspect?: number,
  boxPadding = BOX_PADDING,
): Promise<string> {
  const shot: Screenshot = { src: label, alt: label, annotations, caption: [], aspect };
  return `${styles(state)}<div class="ca">${await figure(shot, state, idFor([shot], state), [], body, zoomContext, boxPadding)}</div>${zoomRuntime(state)}${runtime(state)}`;
}

const screenshot: NodeHandler = async (node, state) => {
  const shot = readScreenshot(node, [], state.renderData);
  return `${styles(state)}<div class="ca">${await figure(shot, state, idFor([shot], state))}</div>${zoomRuntime(state)}${runtime(state)}`;
};

const compare: NodeHandler = async (node, state) => {
  const { title, mode, shots } = readCompare(node, [], state.renderData);
  const id = idFor(shots, state);
  if (mode === "slider") return `${styles(state)}${await slider(title, shots, state, id)}`;
  const margins = (["top", "bottom"] as const).filter((side) =>
    shots.some((shot) => shot.annotations.some((annotation) => annotation.side === side)),
  );
  const figures: string[] = [];
  for (const shot of shots) figures.push(await figure(shot, state, id, margins));
  // Side by side on a wide page, one at a time on a narrow one; both screenshots zoom as one gallery.
  return `${styles(state)}<div class="ca ca-compare" data-wide>${carouselHtml(figures, { columns: 2, title: title ?? "Comparison" }, state)}</div>${runtime(state)}`;
};

/** HTML renderers for `::screenshot`, `::compare`, and `::annotation`. Pass them as `components`; the styles are inlined once per document. */
export const components: Record<"screenshot" | "compare" | "annotation", NodeHandler> = {
  screenshot,
  compare,
  // An annotation outside a screenshot has nothing to point at.
  annotation: () => "",
};
