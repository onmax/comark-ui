import type { Mark } from "../marks.ts";

/** A screenshot as the tour sees it: its size in pixels and whether its edges are dark. */
export interface TourImage {
  width: number;
  height: number;
  dark: boolean;
}

/** One annotation: its box as percentages of the image, its mark, and its note as plain text. */
export interface TourNote {
  x: number;
  y: number;
  w: number;
  h: number;
  mark: Mark;
  color?: string;
  text: string;
  seed: number;
}

export interface TourSide {
  /** Index into the scene's images. */
  image: number;
  title: string;
  ink?: string;
  notes: TourNote[];
}

export interface TourCompare {
  /** The heading above the compare, or its title: the video's caption while it's on screen. */
  caption: string;
  before: TourSide;
  after: TourSide;
}

/** What part of the image fills the frame: the image point (u, v) at its centre, zoomed k times its fitted size. */
export interface Camera {
  u: number;
  v: number;
  k: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A mark and its note, drawn from `start` and gone by `end`. The note box is relative to the mark's screen box. */
export interface PlacedMark {
  image: number;
  box: Rect;
  mark: Mark;
  seed: number;
  color: string;
  lines: string[];
  note?: Rect & { align: "left" | "right" | "center"; card: boolean };
  start: number;
  drawn: number;
  written: number;
  end: number;
}

export interface Scene {
  width: number;
  height: number;
  duration: number;
  images: TourImage[];
  moves: { start: number; end: number; from: Camera; to: Camera }[];
  fades: { start: number; end: number; from?: number; to: number }[];
  marks: PlacedMark[];
  labels: { at: number; text: string }[];
  captions: { at: number; text: string }[];
  /** What the tour shows and when, for a caller that checks it without looking at frames. */
  shots: { start: number; end: number; side: "before" | "after"; notes: string[] }[];
}

/** Measures `text` in the note font at `size` pixels. */
export type Measure = (text: string, size: number) => number;

const FULL: Camera = { u: 0.5, v: 0.5, k: 1 };
const MOVE = 1;
const FADE = 0.45;
const DRAW = 0.55;
const OUT = 0.25;

/** The text sizes for a frame `height` pixels tall, so a 720p tour reads like a 1080p one. */
export function sizes(height: number) {
  const unit = height / 1080;
  return {
    unit,
    note: 46 * unit,
    label: 34 * unit,
    pad: { x: 14 * unit, y: 8 * unit },
    stroke: 5 * unit,
    top: 96 * unit,
    bottom: 104 * unit,
    margin: 40 * unit,
  };
}

/** The area a fitted image fills: the frame less room for the label above and the caption below. */
export function fitArea(width: number, height: number) {
  const s = sizes(height);
  return {
    w: width - 200 * s.unit,
    h: height - 250 * s.unit,
    cx: width / 2,
    cy: height / 2 - 18 * s.unit,
  };
}

export function fitScale(image: TourImage, width: number, height: number) {
  const area = fitArea(width, height);
  return Math.min(area.w / image.width, area.h / image.height);
}

/** Where `rect` (percentages of the image) lands in the frame through `camera`. */
export function toScreen(
  image: TourImage,
  camera: Camera,
  rect: Rect,
  width: number,
  height: number,
): Rect {
  const area = fitArea(width, height);
  const scale = fitScale(image, width, height) * camera.k;
  const left = area.cx - camera.u * image.width * scale;
  const top = area.cy - camera.v * image.height * scale;
  return {
    x: left + (rect.x / 100) * image.width * scale,
    y: top + (rect.y / 100) * image.height * scale,
    w: (rect.w / 100) * image.width * scale,
    h: (rect.h / 100) * image.height * scale,
  };
}

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

const LIGHT = {
  red: "#d01d21",
  amber: "#b45309",
  green: "#037e3f",
  blue: "#0267c7",
  violet: "#7c3aed",
  gray: "#52525b",
};
const DARK = {
  red: "#ff6369",
  amber: "#ffb224",
  green: "#3dd68c",
  blue: "#67b0f9",
  violet: "#b49cff",
  gray: "#a1a1aa",
};

/** A mark's color: its own, else its screenshot's ink, else red before and green after, in shades that read on the image. */
function inkOf(color: string | undefined, dark: boolean, side: "before" | "after") {
  const palette: Record<string, string> = dark ? DARK : LIGHT;
  const name = color ?? (side === "before" ? "red" : "green");
  return palette[name] ?? name;
}

/** Breaks `text` into lines no wider than `max` pixels. */
function wrap(text: string, max: number, size: number, measure: Measure) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(next, size) > max) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

// Frames the marks in `rects`, zoomed so they fill about a third of the frame and leave the side their notes go on
// open. The zoom stops where a screenshot's pixels would show larger than 1.7 frame pixels each, past which it blurs.
function shotCamera(image: TourImage, rects: Rect[], width: number, height: number): Camera {
  const x0 = Math.min(...rects.map((r) => r.x));
  const y0 = Math.min(...rects.map((r) => r.y));
  const x1 = Math.max(...rects.map((r) => r.x + r.w));
  const y1 = Math.max(...rects.map((r) => r.y + r.h));
  const area = fitArea(width, height);
  const fit = fitScale(image, width, height);
  const unit = sizes(height).unit;
  const rw = ((x1 - x0) / 100) * image.width * fit;
  const rh = ((y1 - y0) / 100) * image.height * fit;
  const wide = rw > area.w * 0.45;
  const k = clamp(
    Math.min(
      wide ? (area.w * 0.8) / rw : (area.w * 0.36) / Math.max(rw, 1),
      wide ? (area.h * 0.42) / Math.max(rh, 1) : (area.h * 0.4) / Math.max(rh, 1),
    ),
    1,
    Math.max(1, Math.min(4, (1.7 * unit) / fit)),
  );
  let u = (x0 + x1) / 200;
  let v = (y0 + y1) / 200;
  if (wide) v += ((v > 0.5 ? -1 : 1) * 110 * unit) / (image.height * fit * k);
  else u += ((u > 0.5 ? -1 : 1) * 230 * unit) / (image.width * fit * k);
  const halfU = width / 2 / (image.width * fit * k);
  const halfV = height / 2 / (image.height * fit * k);
  return {
    u: halfU >= 0.5 ? 0.5 : clamp(u, halfU, 1 - halfU),
    v: halfV >= 0.5 ? 0.5 : clamp(v, halfV - 0.03, 1 - halfV + 0.03),
    k,
  };
}

// The room a mark's stroke takes around its box on screen, so a note never sits on its own loop.
function inkBounds(box: Rect, mark: Mark, unit: number): Rect {
  const room = (mark === "circle" ? Math.max(14, Math.min(box.w, box.h) * 0.35) : 10) * unit;
  return { x: box.x - room, y: box.y - room, w: box.w + 2 * room, h: box.h + 2 * room };
}

const overlap = (a: Rect, b: Rect) =>
  Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
  Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

// Puts a note beside its mark: in the margin outside the screenshot when there is room, else beside, below, or above
// the mark, wherever it covers the least of the page and none of the other notes.
function placeNote(
  box: Rect,
  text: string,
  taken: Rect[],
  image: Rect,
  width: number,
  height: number,
  measure: Measure,
) {
  const s = sizes(height);
  const gap = 14 * s.unit;
  const options: (Rect & { align: "left" | "right" | "center"; lines: string[] })[] = [];
  for (const max of [560, 420, 320].map((value) => value * s.unit)) {
    const lines = wrap(text, max, s.note, measure);
    const w = Math.max(...lines.map((line) => measure(line, s.note))) + 2 * s.pad.x;
    const h = lines.length * s.note * 1.05 + 2 * s.pad.y;
    const y = box.y + box.h / 2 - h / 2;
    options.push(
      { x: image.x - 28 * s.unit - w, y, w, h, align: "right", lines },
      { x: image.x + image.w + 28 * s.unit, y, w, h, align: "left", lines },
      { x: box.x - gap - w, y, w, h, align: "right", lines },
      { x: box.x + box.w + gap, y, w, h, align: "left", lines },
      { x: box.x + box.w / 2 - w / 2, y: box.y + box.h + gap, w, h, align: "center", lines },
      { x: box.x + box.w / 2 - w / 2, y: box.y - gap - h, w, h, align: "center", lines },
    );
  }
  const score = (o: Rect, index: number) => {
    const inside =
      o.x >= s.margin &&
      o.y >= s.top &&
      o.x + o.w <= width - s.margin &&
      o.y + o.h <= height - s.bottom;
    const distance = Math.hypot(
      o.x + o.w / 2 - box.x - box.w / 2,
      o.y + o.h / 2 - box.y - box.h / 2,
    );
    return (
      (inside ? 0 : 1000) +
      taken.filter((t) => overlap(o, t) > 0).length * 100 +
      (overlap(o, image) / (o.w * o.h)) * 6 +
      distance / (400 * s.unit) +
      index * 0.001
    );
  };
  const best = options
    .map((option, index) => ({ option, score: score(option, index) }))
    .sort((a, b) => a.score - b.score)[0]!.option;
  const placed = {
    ...best,
    x: clamp(best.x, s.margin, width - s.margin - best.w),
    y: clamp(best.y, s.top, height - s.bottom - best.h),
  };
  return { ...placed, card: overlap(placed, image) > 0 };
}

// Pairs each before mark with the nearest after mark within a fifth of the image, so a change seen in one place on
// both sides is shown through one camera, and the rest get a shot of their own.
function pairs(before: TourNote[], after: TourNote[]) {
  const used = new Set<number>();
  const centre = (n: TourNote) => [n.x + n.w / 2, n.y + n.h / 2] as const;
  const shots: { before: TourNote[]; after: TourNote[] }[] = [];
  for (const b of before) {
    let best = -1;
    let distance = 22;
    after.forEach((a, index) => {
      if (used.has(index)) return;
      const [bx, by] = centre(b);
      const [ax, ay] = centre(a);
      const d = Math.hypot(bx - ax, by - ay);
      if (d < distance) [best, distance] = [index, d];
    });
    if (best >= 0) used.add(best);
    shots.push({ before: [b], after: best >= 0 ? [after[best]!] : [] });
  }
  after.forEach((a, index) => {
    if (!used.has(index)) shots.push({ before: [], after: [a] });
  });
  return shots;
}

/**
 * Plans a tour of `compares`: for each, the whole before, then a shot per change with its mark drawn and its note
 * written, before then after through the same camera, and the whole after with its marks to close.
 */
export function plan(
  compares: TourCompare[],
  images: TourImage[],
  measure: Measure,
  width = 1920,
  height = 1080,
): Scene {
  const scene: Scene = {
    width,
    height,
    duration: 0,
    images,
    moves: [],
    fades: [],
    marks: [],
    labels: [],
    captions: [],
    shots: [],
  };
  const s = sizes(height);
  let t = 0;
  let camera = FULL;
  let shown: number | undefined;
  const moveTo = (to: Camera, duration = MOVE) => {
    scene.moves.push({ start: t, end: t + duration, from: camera, to });
    camera = to;
    t += duration;
  };
  const show = (side: TourSide, duration = FADE) => {
    if (shown === side.image) return;
    scene.labels.push({ at: t, text: side.title });
    scene.fades.push({ start: t, end: t + duration, from: shown, to: side.image });
    shown = side.image;
    t += duration;
  };
  const reading = (text: string) => clamp(0.9 + text.length * 0.045, 1.4, 3.4);
  const clear = () => {
    for (const mark of scene.marks) if (mark.end === Infinity) mark.end = t + OUT;
    t += OUT;
  };
  const mark = (side: TourSide, which: "before" | "after", notes: TourNote[], at: Camera) => {
    const image = images[side.image]!;
    const frame = toScreen(image, at, { x: 0, y: 0, w: 100, h: 100 }, width, height);
    const taken: Rect[] = [];
    const start = t;
    let end = t;
    notes.forEach((note, index) => {
      const box = toScreen(image, at, note, width, height);
      const ink = inkBounds(box, note.mark, s.unit);
      taken.push(ink);
      const placed = note.text
        ? placeNote(ink, note.text, taken, frame, width, height, measure)
        : undefined;
      if (placed) taken.push(placed);
      const begin = start + index * 0.5;
      const write = clamp(note.text.length * 0.02, 0.45, 1);
      scene.marks.push({
        image: side.image,
        box: { x: note.x, y: note.y, w: note.w, h: note.h },
        mark: note.mark,
        seed: note.seed,
        color: inkOf(note.color ?? side.ink, image.dark, which),
        lines: placed?.lines ?? [],
        note: placed && {
          x: placed.x - box.x,
          y: placed.y - box.y,
          w: placed.w,
          h: placed.h,
          align: placed.align,
          card: placed.card,
        },
        start: begin,
        drawn: begin + DRAW,
        written: begin + DRAW + (placed ? write : 0),
        end: Infinity,
      });
      end = Math.max(end, begin + DRAW + (placed ? write + reading(note.text) : 1));
    });
    scene.shots.push({ start, end, side: which, notes: notes.map((note) => note.text) });
    t = end;
  };

  for (const compare of compares) {
    const { before, after } = compare;
    scene.captions.push({ at: t, text: compare.caption });
    if (camera !== FULL) moveTo(FULL);
    show(before);
    t += 1.3;
    for (const shot of pairs(before.notes, after.notes)) {
      const first = shot.before.length ? before : after;
      const at = shotCamera(images[first.image]!, [...shot.before, ...shot.after], width, height);
      if (shown !== first.image) show(first, 0.3);
      moveTo(at);
      if (shot.before.length) {
        mark(before, "before", shot.before, at);
        clear();
      }
      if (shot.after.length) {
        // A short crossfade: before and after rarely line up past the change, and a long one shows both at once.
        if (shown !== after.image) show(after, 0.2);
        t += 0.2;
        mark(after, "after", shot.after, at);
        clear();
      }
    }
    show(after);
    moveTo(FULL, 1.1);
    for (const note of after.notes)
      scene.marks.push({
        image: after.image,
        box: { x: note.x, y: note.y, w: note.w, h: note.h },
        mark: note.mark,
        seed: note.seed,
        color: inkOf(note.color ?? after.ink, images[after.image]!.dark, "after"),
        lines: [],
        start: t,
        drawn: t + DRAW,
        written: t + DRAW,
        end: Infinity,
      });
    t += DRAW + 1.6;
    clear();
    t += 0.2;
  }
  scene.duration = t + 0.3;
  return scene;
}

const ease = (p: number) => {
  const x = clamp(p, 0, 1);
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
};

/** The camera at time `t`. */
export function cameraAt(scene: Scene, t: number): Camera {
  let camera = FULL;
  for (const move of scene.moves) {
    if (t < move.start) break;
    const p = ease((t - move.start) / (move.end - move.start));
    const { from, to } = move;
    camera = {
      u: from.u + (to.u - from.u) * p,
      v: from.v + (to.v - from.v) * p,
      k: Math.exp(Math.log(from.k) + (Math.log(to.k) - Math.log(from.k)) * p),
    };
  }
  return camera;
}

/** The images on screen at time `t`, the one fading in last, each with its opacity. */
export function layersAt(scene: Scene, t: number) {
  let current: Scene["fades"][number] | undefined;
  for (const fade of scene.fades) if (t >= fade.start) current = fade;
  if (!current) return [];
  const p = clamp((t - current.start) / (current.end - current.start), 0, 1);
  const layers: { image: number; opacity: number }[] = [];
  if (current.from !== undefined && p < 1) layers.push({ image: current.from, opacity: 1 });
  layers.push({ image: current.to, opacity: p });
  return layers;
}

export { ease };
