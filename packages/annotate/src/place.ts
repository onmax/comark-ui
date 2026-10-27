import type { Annotation } from "./read.ts";

// Boxes are percentages but stamps and strokes are fixed sizes, so both are worked out for one rendered size: a compare
// column on a laptop, the narrowest common one, where a stamp covers the most.
const WIDTH = 420;
// An image without a `viewport` is taken to be 16:10.
const ASPECT = 0.625;
// Keep these in step with `.ca-stamp` and `.ca-mark .ca-stamp` in styles.ts.
const SIZE = 15;
const DIGIT = 5.5;
const GAP = 4;
// Each stamp draws a 2px ring, so two stamps closer than both rings would touch.
const CLEAR = 4;
// Default CSS-pixel clearance, shared with styles.ts; the number sits on that padded corner.
export const BOX_PADDING = 6;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** An annotation's box in pixels at the reference size, which places the stamps and draws the marks. */
export function pixels(annotation: Pick<Annotation, "x" | "y" | "w" | "h">, aspect = ASPECT): Rect {
  const height = WIDTH * aspect;
  return {
    x: (annotation.x / 100) * WIDTH,
    y: (annotation.y / 100) * height,
    w: (annotation.w / 100) * WIDTH,
    h: (annotation.h / 100) * height,
  };
}

const overlap = (a: Rect, b: Rect) =>
  Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
  Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

// Top corners first, since a number above its mark reads before it; left first, since the notes list reads that way.
const CORNERS = [
  [false, false],
  [true, false],
  [false, true],
  [true, true],
] as const;

export interface Placement {
  /** Where each stamp sits against its mark, as CSS offsets, by the annotation's `n`. */
  css: Map<number, string>;
  /** Numbered annotations whose stamps overlap at every corner, as their positions in the screenshot, counted from 1. */
  clashes: [number, number][];
}

/**
 * Centers each stamp on a corner of its mark: the first corner, in order, where it covers no earlier stamp, then the
 * one that covers the least of the other marks, the ticks, and the arrows. Where that would push it past the image's
 * edge it lines up with the mark's edge instead, and in a corner of the image it moves inside its mark.
 */
export function place(
  annotations: Annotation[],
  aspect = ASPECT,
  boxPadding = BOX_PADDING,
): Placement {
  const height = WIDTH * aspect;
  const box = (annotation: Annotation) => {
    const area = pixels(annotation, aspect);
    if (annotation.mark !== "box") return area;
    return {
      x: area.x - boxPadding,
      y: area.y - boxPadding,
      w: area.w + 2 * boxPadding,
      h: area.h + 2 * boxPadding,
    };
  };
  // A stamp on its own mark's corner always covers some of that mark, so only its tick and arrow count against it.
  const covered = annotations.flatMap((annotation, owner) => {
    const { x, y, w, h } = box(annotation);
    const [cx, cy] = [x + w / 2, y + h / 2];
    return [
      { x, y, w, h, owner, own: true },
      ...(annotation.mark === "check" ? [{ x: x + w + GAP, y: cy - 10, w: 20, h: 20 }] : []),
      ...(annotation.side === "right" ? [{ x: x + w, y: cy - 8, w: WIDTH - x - w, h: 16 }] : []),
      ...(annotation.side === "left" ? [{ x: 0, y: cy - 8, w: x, h: 16 }] : []),
      ...(annotation.side === "top" ? [{ x: cx - 12, y: 0, w: 24, h: y }] : []),
    ];
  });
  const css = new Map<number, string>();
  const clashes: [number, number][] = [];
  const placed: { index: number; numbered: boolean; rect: Rect }[] = [];
  for (const [index, annotation] of annotations.entries()) {
    const b = box(annotation);
    const w = SIZE + Math.max(0, String(annotation.number ?? "A").length - 1) * DIGIT;
    const numbered = annotation.number !== undefined;
    // A mark that draws nothing is only its number, which styles.ts keeps on the corner.
    if (annotation.mark === "none") {
      placed.push({
        index,
        numbered,
        rect: { x: b.x - SIZE / 2, y: b.y - SIZE / 2, w: SIZE, h: SIZE },
      });
      continue;
    }
    let best: { rect: Rect; css: string; hits: typeof placed; cost: [number, number] } | undefined;
    for (const [right, bottom] of CORNERS) {
      // Centered on the corner, the stamp sits on its mark's stroke and reaches only a few pixels past it, so it can't
      // be read as the number of whatever sits next to the mark.
      const cornerX = right ? b.x + b.w : b.x;
      const cornerY = bottom ? b.y + b.h : b.y;
      let x = cornerX - w / 2;
      let y = cornerY - SIZE / 2;
      const slideX = right ? x + w > WIDTH + GAP : x < -GAP;
      const slideY = bottom ? y + SIZE > height + GAP : y < -GAP;
      const inside = slideX && slideY;
      if (inside) x = right ? cornerX - 3 - w : cornerX + 3;
      else if (slideX) x = right ? cornerX + GAP - w : cornerX - GAP;
      if (inside) y = bottom ? cornerY - 3 - SIZE : cornerY + 3;
      else if (slideY) y = bottom ? cornerY + GAP - SIZE : cornerY - GAP;
      const [near, far] = [right ? "right" : "left", right ? "50%" : "-50%"];
      const [edge, down] = [bottom ? "bottom" : "top", bottom ? "50%" : "-50%"];
      const offset = (inner: boolean, slide: boolean) =>
        inner ? "3px" : slide ? `-${GAP}px` : "0";
      const shift = (slide: boolean, half: string) => (slide ? "0" : half);
      const rect = { x, y, w, h: SIZE };
      const ring = { x: x - CLEAR, y: y - CLEAR, w: w + 2 * CLEAR, h: SIZE + 2 * CLEAR };
      const hits = placed.filter((stamp) => overlap(ring, stamp.rect) > 0);
      const cost: [number, number] = [
        hits.reduce((sum, stamp) => sum + overlap(ring, stamp.rect), 0),
        covered.reduce(
          (sum, area) => ("own" in area && area.owner === index ? sum : sum + overlap(rect, area)),
          0,
        ),
      ];
      if (!best || cost[0] < best.cost[0] || (cost[0] === best.cost[0] && cost[1] < best.cost[1]))
        best = {
          rect,
          css: [
            `${near}:${offset(inside, slideX)}`,
            `${edge}:${offset(inside, slideY)}`,
            ...(inside ? [] : [`translate:${shift(slideX, far)} ${shift(slideY, down)}`]),
          ].join(";"),
          hits,
          cost,
        };
      if (!cost[0] && !cost[1]) break;
    }
    // CORNERS isn't empty, so the loop always sets `best`.
    const chosen = best!;
    css.set(annotation.n, chosen.css);
    placed.push({ index, numbered, rect: chosen.rect });
    if (numbered)
      for (const stamp of chosen.hits)
        if (stamp.numbered) clashes.push([stamp.index + 1, index + 1]);
  }
  return { css, clashes };
}
