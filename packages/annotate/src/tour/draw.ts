import type { Image, Path2D, SKRSContext2D } from "@napi-rs/canvas";
import { draw } from "../marks.ts";
import {
  cameraAt,
  ease,
  fitArea,
  fitScale,
  layersAt,
  sizes,
  toScreen,
  type PlacedMark,
  type Rect,
  type Scene,
} from "./plan.ts";

/** The font every word in a tour is written in: comark-annotate's Caveat, registered under this name by the host. */
export const FONT = "comark-caveat";

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

// Maps a mark's SVG path from its viewBox onto `to`, the way the HTML renderer stretches its SVG, so the stroke
// keeps one width however the box is scaled. Marks are absolute M, L, Q, and C commands, so numbers come in x, y pairs.
function fit(paths: string[], viewBox: string, to: Rect, keep: boolean) {
  const [vx = 0, vy = 0, vw = 1, vh = 1] = viewBox.split(" ").map(Number);
  let [sx, sy] = [to.w / vw, to.h / vh];
  let [ox, oy] = [to.x, to.y];
  if (keep) {
    const scale = Math.min(sx, sy);
    ox += (to.w - vw * scale) / 2;
    oy += (to.h - vh * scale) / 2;
    [sx, sy] = [scale, scale];
  }
  let length = 0;
  const out = paths.map((path) => {
    let index = 0;
    let last: [number, number] | undefined;
    let x = 0;
    return path.replace(/-?\d+(?:\.\d+)?/g, (value) => {
      const number = Number(value);
      if (index++ % 2 === 0) {
        x = ox + (number - vx) * sx;
        return x.toFixed(1);
      }
      const y = oy + (number - vy) * sy;
      if (last) length += Math.hypot(x - last[0], y - last[1]);
      last = [x, y];
      return y.toFixed(1);
    });
  });
  return { paths: out, length: length * 1.2 };
}

function strokeMark(
  context: SKRSContext2D,
  Path: typeof Path2D,
  mark: PlacedMark,
  box: Rect,
  progress: number,
  width: number,
) {
  if (mark.mark === "none") return;
  // A box's line runs along its own edge, so it gets the room the HTML renderer pads it out by; the other marks
  // draw past their viewBox and stand 5px out from the area.
  const room = mark.mark === "box" ? 6 : mark.mark === "highlight" ? 0 : 5;
  const area = { x: box.x - room, y: box.y - room, w: box.w + 2 * room, h: box.h + 2 * room };
  const drawing = draw(mark.mark, box.w, box.h, mark.seed);
  const { paths, length } = fit(
    drawing.paths,
    drawing.viewBox,
    area,
    mark.mark === "check" || mark.mark === "cross",
  );
  context.save();
  context.strokeStyle = mark.color;
  context.lineWidth = width;
  context.lineCap = "round";
  context.lineJoin = "round";
  if (progress < 1) context.setLineDash([Math.max(0.01, length * progress), length * 4]);
  if (mark.mark === "highlight") {
    context.globalAlpha *= 0.22 * progress;
    context.fillStyle = mark.color;
    for (const path of paths) context.fill(new Path(path));
  } else for (const path of paths) context.stroke(new Path(path));
  context.restore();
}

function roundRect(context: SKRSContext2D, rect: Rect, radius: number) {
  const r = Math.min(radius, rect.w / 2, rect.h / 2);
  context.beginPath();
  context.moveTo(rect.x + r, rect.y);
  context.arcTo(rect.x + rect.w, rect.y, rect.x + rect.w, rect.y + rect.h, r);
  context.arcTo(rect.x + rect.w, rect.y + rect.h, rect.x, rect.y + rect.h, r);
  context.arcTo(rect.x, rect.y + rect.h, rect.x, rect.y, r);
  context.arcTo(rect.x, rect.y, rect.x + rect.w, rect.y, r);
  context.closePath();
}

function pill(
  context: SKRSContext2D,
  text: string,
  size: number,
  x: number,
  y: number,
  anchor: "left" | "center",
  opacity: number,
) {
  if (!text || opacity <= 0) return;
  context.save();
  context.globalAlpha = opacity;
  context.font = `${size}px ${FONT}`;
  const pad = size * 0.55;
  const w = context.measureText(text).width + 2 * pad;
  const h = size * 1.45;
  const left = anchor === "center" ? x - w / 2 : x;
  context.fillStyle = "rgba(20, 20, 20, 0.84)";
  roundRect(context, { x: left, y, w, h }, h / 2);
  context.fill();
  context.fillStyle = "#fff";
  context.textBaseline = "middle";
  context.fillText(text, left + pad, y + h / 2 + size * 0.04);
  context.restore();
}

/** Draws the tour's frame at `t` seconds onto `context`, which is `scene.width` by `scene.height` pixels. */
export function drawFrame(
  context: SKRSContext2D,
  scene: Scene,
  sources: Image[],
  t: number,
  Path: typeof Path2D,
) {
  const { width, height } = scene;
  const s = sizes(height);
  const camera = cameraAt(scene, t);
  const layers = layersAt(scene, t);
  const top = layers.find((layer) => layer.opacity >= 0.5) ?? layers[0];
  const dark = top ? scene.images[top.image]!.dark : false;

  context.save();
  context.fillStyle = dark ? "#0d0d0e" : "#ececea";
  context.fillRect(0, 0, width, height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  for (const layer of layers) {
    const image = scene.images[layer.image]!;
    const scale = fitScale(image, width, height) * camera.k;
    const area = fitArea(width, height);
    const rect = {
      x: area.cx - camera.u * image.width * scale,
      y: area.cy - camera.v * image.height * scale,
      w: image.width * scale,
      h: image.height * scale,
    };
    context.globalAlpha = layer.opacity;
    if (camera.k < 1.05) {
      context.save();
      context.shadowColor = "rgba(0, 0, 0, 0.28)";
      context.shadowBlur = 40 * s.unit;
      context.shadowOffsetY = 16 * s.unit;
      context.fillStyle = dark ? "#000" : "#fff";
      context.fillRect(rect.x, rect.y, rect.w, rect.h);
      context.restore();
    }
    context.drawImage(sources[layer.image]!, rect.x, rect.y, rect.w, rect.h);
  }
  context.globalAlpha = 1;

  for (const mark of scene.marks) {
    if (t < mark.start || t > mark.end + 0.25) continue;
    const layer = layers.find((item) => item.image === mark.image);
    if (!layer) continue;
    const fade = t > mark.end ? 1 - (t - mark.end) / 0.25 : 1;
    const opacity = layer.opacity * fade;
    if (opacity <= 0) continue;
    const box = toScreen(scene.images[mark.image]!, camera, mark.box, width, height);
    context.save();
    context.globalAlpha = opacity;
    strokeMark(
      context,
      Path,
      mark,
      box,
      t >= mark.drawn ? 1 : ease((t - mark.start) / (mark.drawn - mark.start)),
      s.stroke,
    );
    const note = mark.note;
    if (note && t > mark.drawn) {
      const rect = { x: box.x + note.x, y: box.y + note.y, w: note.w, h: note.h };
      const written = clamp((t - mark.drawn) / (mark.written - mark.drawn), 0, 1);
      // The note writes itself left to right, card and all.
      context.beginPath();
      context.rect(rect.x - 30, rect.y - 30, (rect.w + 30) * written + 30, rect.h + 60);
      context.clip();
      if (note.card) {
        context.save();
        context.shadowColor = "rgba(0, 0, 0, 0.18)";
        context.shadowBlur = 24 * s.unit;
        context.shadowOffsetY = 6 * s.unit;
        context.fillStyle = dark ? "rgba(18, 18, 20, 0.92)" : "rgba(255, 255, 255, 0.94)";
        roundRect(context, rect, 12 * s.unit);
        context.fill();
        context.restore();
      }
      context.fillStyle = mark.color;
      context.font = `${s.note}px ${FONT}`;
      context.textBaseline = "top";
      context.textAlign = note.align;
      const x =
        note.align === "left"
          ? rect.x + s.pad.x
          : note.align === "right"
            ? rect.x + rect.w - s.pad.x
            : rect.x + rect.w / 2;
      mark.lines.forEach((line, index) =>
        context.fillText(line, x, rect.y + s.pad.y + index * s.note * 1.05),
      );
    }
    context.restore();
  }

  const latest = <T extends { at: number }>(list: T[]) => {
    let found: T | undefined;
    for (const item of list) if (t >= item.at) found = item;
    return found;
  };
  pill(context, latest(scene.labels)?.text ?? "", s.label, 48 * s.unit, 36 * s.unit, "left", 1);
  pill(
    context,
    latest(scene.captions)?.text ?? "",
    s.label,
    width / 2,
    height - 30 * s.unit - s.label * 1.45,
    "center",
    clamp((1.4 - camera.k) / 0.3, 0, 1),
  );
  context.restore();
}
