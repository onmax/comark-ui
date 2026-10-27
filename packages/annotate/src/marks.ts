// Hand-drawn marks after AnnotationKit (https://annotationkit.vercel.app). Each one stretches over the annotated area
// and wobbles its own way, seeded by the annotation, so no two marks match and a render always draws the same.

interface Drawing {
  viewBox: string;
  paths: string[];
}
type Point = readonly [number, number];
type Edge = "left" | "right" | "top" | "bottom";
type Draw = (width: number, height: number, random: () => number, edge: Edge) => Drawing;

const round = (value: number) => Math.round(value * 10) / 10;
const point = ([x, y]: Point) => `${round(x)} ${round(y)}`;

// Four corners joined by slightly bowed strokes, in the box's own pixels so the line keeps the same distance from the
// target at any size. A box's last stroke runs on past where the first began, the way a pen does. It starts and ends at
// the bottom right, the last corner a number tries, so that tail stays clear of the number.
function outline(
  width: number,
  height: number,
  out: number,
  random: () => number,
  overshoot: number,
) {
  const corners: Point[] = [
    [width + out, height + out],
    [-out, height + out],
    [-out, -out],
    [width + out, -out],
  ].map(([x, y]) => [x! + random() * 1.5, y! + random() * 1.5]);
  return corners.map((from, index) => {
    const next = corners[(index + 1) % 4]!;
    const [dx, dy] = [next[0] - from[0], next[1] - from[1]];
    const length = Math.hypot(dx, dy) || 1;
    const run = index === 3 ? overshoot / length : 0;
    const to: Point = [next[0] + dx * run, next[1] + dy * run];
    const bow = Math.min(3, length * 0.04);
    const [a, b] = [random() * bow, random() * bow];
    const [nx, ny] = [-dy / length, dx / length];
    return {
      from,
      curve: `C${point([from[0] + dx / 3 + nx * a, from[1] + dy / 3 + ny * a])} ${point([from[0] + (2 * dx) / 3 + nx * b, from[1] + (2 * dy) / 3 + ny * b])} ${point(to)}`,
    };
  });
}

// A drawing that stretches over any area, nudged a little. A point that appears twice moves the same way both times,
// so strokes that meet still meet.
function wobbly(viewBox: string, paths: string[], amount: number): Draw {
  return (_width, _height, random) => {
    const moved = new Map<string, number>();
    const shift = (key: string) => {
      if (!moved.has(key)) moved.set(key, random() * amount);
      return moved.get(key)!;
    };
    return {
      viewBox,
      paths: paths.map((path) => {
        let index = 0;
        return path.replace(/\d+(?:\.\d+)?/g, (value) =>
          String(round(Number(value) + shift(`${index++ % 2}:${value}`))),
        );
      }),
    };
  };
}

export const marks = {
  // Draws nothing: the arrow from a side note does the pointing.
  none: () => ({ viewBox: "0 0 1 1", paths: [] }),
  // The line runs along its SVG's edge, which styles.ts pads out from the area by `--ca-pad` on the page, so the box
  // frames the target with the same room at any rendered size instead of shrinking onto it as the image grows.
  box: (width, height, random) => ({
    viewBox: `0 0 ${round(width)} ${round(height)}`,
    paths: outline(width, height, 0, random, 4).map(({ from, curve }) => `M${point(from)}${curve}`),
  }),
  // A loop drawn around the area: a rounded square stretched to it, through its corners with the same room past each
  // side, so it hugs a long bar or a short word alike. It starts at the top left and runs on a little past its start,
  // outside it, the way a pen does.
  circle: (width, height, random) => {
    const [half, halfHeight] = [width / 2, height / 2];
    // How square the loop is: round around a square area, squarer along a long one, since an ellipse around a long
    // area leaves its corners far inside it and has to reach well past its ends.
    const ratio = Math.max(half, halfHeight) / Math.max(1, Math.min(half, halfHeight));
    const loop = 2 + Math.min(0.6, (ratio - 1) * 0.3);
    // The room `d` that puts the corners on the curve with half-axes `half + d` and `halfHeight + d`.
    let [low, high] = [0, Math.max(half, halfHeight, 1)];
    for (let step = 0; step < 24; step++) {
      const d = (low + high) / 2;
      if ((half / (half + d)) ** loop + (halfHeight / (halfHeight + d)) ** loop > 1) low = d;
      else high = d;
    }
    const room = Math.max(high, 4) + 3;
    const [a, b] = [half + room, halfHeight + room];
    const along = (value: number) => Math.sign(value) * Math.abs(value) ** (2 / loop);
    const phase = random() * Math.PI;
    const start = -0.72 * Math.PI + random() * 0.1;
    const sweep = 2 * Math.PI + 0.3 + random() * 0.1;
    const points: Point[] = [];
    for (let index = 0; index <= 40; index++) {
      const done = index / 40;
      const angle = start - done * sweep;
      // Wider as it goes, so its end passes outside its start, and a slow sway so no two loops match.
      const grow = 1 + 0.06 * done + 0.02 * (1 + Math.sin(2 * angle + phase));
      points.push([
        half + a * grow * along(Math.cos(angle)),
        halfHeight + b * grow * along(Math.sin(angle)),
      ]);
    }
    // Catmull-Rom through the points, as cubic curves.
    const curves = points.slice(1).map((to, index) => {
      const from = points[index]!;
      const [before, after] = [points[index - 1] ?? from, points[index + 2] ?? to];
      return `C${point([from[0] + (to[0] - before[0]) / 6, from[1] + (to[1] - before[1]) / 6])} ${point([to[0] - (after[0] - from[0]) / 6, to[1] - (after[1] - from[1]) / 6])} ${point(to)}`;
    });
    return {
      viewBox: `-5 -5 ${round(width + 10)} ${round(height + 10)}`,
      paths: [`M${point(points[0]!)}${curves.join("")}`],
    };
  },
  underline: wobbly("0 0 200 60", ["M8 32C58 22 142 40 192 26"], 6),
  // A straight stroke through the middle of the area, along its longer side, end to end: a limit across a screenshot,
  // or a target across a chart.
  line: (width, height, random) => {
    const across = width >= height;
    const [length, middle] = across ? [width, height / 2] : [height, width / 2];
    const at = (along: number, off: number): Point => (across ? [along, off] : [off, along]);
    const bow = Math.min(2, length * 0.01) * random();
    return {
      viewBox: `-5 -5 ${round(width + 10)} ${round(height + 10)}`,
      paths: [
        `M${point(at(0, middle + random() * 0.8))}Q${point(at(length / 2, middle + bow))} ${point(at(length, middle + random() * 0.8))}`,
      ],
    };
  },
  highlight: (width, height, random) => {
    const sides = outline(width, height, 0, random, 0);
    return {
      viewBox: `0 0 ${round(width)} ${round(height)}`,
      paths: [`M${point(sides[0]!.from)}${sides.map(({ curve }) => curve).join("")}Z`],
    };
  },
  // A square bracket along one edge, 3px outside it, with short ends turning back toward the area: it spans a run of
  // rows or a group without covering any of them. It stands on the edge that faces the side note, if there is one.
  bracket: (width, height, random, edge) => {
    const end = Math.min(7, (edge === "left" || edge === "right" ? width : height) / 2);
    const wobble = (value: number) => value + random() * 1.2;
    const across = edge === "left" || edge === "right";
    const line =
      edge === "left" ? -3 : edge === "right" ? width + 3 : edge === "top" ? -3 : height + 3;
    const back = edge === "left" || edge === "top" ? line + end : line - end;
    const length = across ? height : width;
    const at = (along: number, off: number): Point =>
      across ? [wobble(off), wobble(along)] : [wobble(along), wobble(off)];
    const bow = Math.min(3, length * 0.03) * random();
    const [a, b] = [at(0, back), at(0, line)];
    const [c, d] = [at(length, line), at(length, back)];
    const mid = at(length / 2, line + bow);
    return {
      viewBox: `-5 -5 ${round(width + 10)} ${round(height + 10)}`,
      paths: [`M${point(a)}L${point(b)}Q${point(mid)} ${point(c)}L${point(d)}`],
    };
  },
  cross: wobbly("0 0 100 100", ["M20 20C40 42 60 62 80 82", "M80 20C60 42 40 62 20 82"], 4),
  check: wobbly("0 0 100 100", ["M14 54C26 60 34 70 42 82C54 54 68 30 88 14"], 5),
} satisfies Record<string, Draw>;

export type Mark = keyof typeof marks;

// mulberry32: small, fast, and the same in every runtime, from -1 to 1.
function generator(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  };
}

/** Draws `mark` over an area of `width` by `height` pixels, wobbling it by `seed`. A bracket stands on `edge`. */
export function draw(
  mark: Mark,
  width: number,
  height: number,
  seed: number,
  edge: Edge = "left",
): Drawing {
  return marks[mark](width, height, generator(seed), edge);
}
