import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { parseMarkdown, type Node } from "comark";
import { textContent } from "comark/utils";
import annotate from "./index.ts";
import { caveat } from "./font.ts";
import { seed } from "./marks.ts";
import { readCompare, type Screenshot } from "./read.ts";
import { drawFrame, FONT } from "./tour/draw.ts";
import { plan, type Scene, type TourCompare, type TourImage, type TourSide } from "./tour/plan.ts";
import { childrenOf, isElement } from "../../../shared/nodes.ts";

export type { Scene } from "./tour/plan.ts";

export interface TourOptions {
  /** The folder or URL that relative image paths resolve against. Defaults to the working directory. */
  base?: string | URL;
  /** The frame size in pixels. Defaults to 1920 by 1080. */
  width?: number;
  height?: number;
  /** Frames per second of the video. Defaults to 30. */
  fps?: number;
}

export interface Tour {
  /** Seconds. 0 when the document has no compare the tour could load. */
  duration: number;
  fps: number;
  width: number;
  height: number;
  /** The document's problems, and each screenshot the tour couldn't load. */
  issues: string[];
  /** What the tour shows and when: each change, on which side, with its notes. */
  shots: Scene["shots"];
  /** The frame at `t` seconds, as a PNG. */
  frame(t: number): Promise<Uint8Array>;
  /** `count` frames spread over the tour in one PNG, three across, to check it without playing it. */
  sheet(count?: number): Promise<Uint8Array>;
  /** Encodes the tour to an H.264 MP4 at `file`. Needs ffmpeg on the PATH, or its path in `ffmpeg`. */
  write(file: string, options?: { ffmpeg?: string }): Promise<void>;
}

type Canvas = typeof import("@napi-rs/canvas");

async function loadCanvas(): Promise<Canvas> {
  try {
    return await import("@napi-rs/canvas");
  } catch {
    throw new Error(
      "comark-annotate tour draws with @napi-rs/canvas, which isn't installed. Install it next to comark-annotate: pnpm add -D @napi-rs/canvas",
    );
  }
}

async function bytes(src: string, base: string | URL): Promise<Uint8Array> {
  if (src.startsWith("data:")) {
    const comma = src.indexOf(",");
    const meta = src.slice(0, comma);
    const body = src.slice(comma + 1);
    return meta.endsWith(";base64")
      ? Buffer.from(body, "base64")
      : Buffer.from(decodeURIComponent(body));
  }
  const root =
    base instanceof URL
      ? base
      : /^https?:\/\//i.test(base)
        ? new URL(base)
        : pathToFileURL(`${base}/`);
  const url = new URL(src, root);
  if (url.protocol === "file:") return readFile(url);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

const noteText = (note: Node[]) =>
  textContent(["div", {}, ...note])
    .replace(/\s+/g, " ")
    .trim();

// Each compare with its two screenshots, and the heading above it, which becomes its caption.
function compares(nodes: Node[], data: Parameters<typeof readCompare>[2]) {
  const found: { caption: string; shots: Screenshot[] }[] = [];
  let heading = "";
  const walk = (list: Node[]) => {
    for (const node of list) {
      if (!isElement(node)) continue;
      if (/^h[1-3]$/.test(node[0])) heading = textContent(node).trim();
      else if (node[0] === "compare") {
        const compare = readCompare(node, [], data);
        if (compare.shots.length === 2)
          found.push({ caption: compare.title ?? heading, shots: compare.shots });
      } else walk(childrenOf(node));
    }
  };
  walk(nodes);
  return found;
}

/**
 * Plans a video tour of every `::compare` in `markdown`: it zooms to each change, draws its mark, writes its note,
 * and cuts between before and after at the same place. Draws with @napi-rs/canvas, so it needs no browser.
 */
export async function tour(markdown: string, options: TourOptions = {}): Promise<Tour> {
  const { width = 1920, height = 1080, fps = 30, base = process.cwd() } = options;
  const canvas = await loadCanvas();
  canvas.GlobalFonts.register(Buffer.from(caveat, "base64"), FONT);
  const document = await parseMarkdown(markdown, { plugins: [annotate()] });
  const issues = [...(document.meta.issues ?? [])];
  const data = { frontmatter: document.frontmatter, meta: document.meta, data: {}, props: {} };

  const sources: Awaited<ReturnType<Canvas["loadImage"]>>[] = [];
  const images: TourImage[] = [];
  const read: TourCompare[] = [];
  const probe = canvas.createCanvas(16, 16).getContext("2d");
  for (const compare of compares(document.nodes, data)) {
    const sides: TourSide[] = [];
    for (const shot of compare.shots) {
      try {
        const image = await canvas.loadImage(Buffer.from(await bytes(shot.src, base)));
        // Its corners say whether the page is dark, which picks the background and the ink.
        probe.clearRect(0, 0, 16, 16);
        probe.drawImage(image, 0, 0, 16, 16);
        const pixels = probe.getImageData(0, 0, 16, 16).data;
        const corners = [0, 15, 240, 255].map((index) => {
          const [r, g, b] = [pixels[index * 4]!, pixels[index * 4 + 1]!, pixels[index * 4 + 2]!];
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        });
        images.push({
          width: image.width,
          height: image.height,
          dark: corners.reduce((sum, value) => sum + value, 0) / 4 < 128,
        });
        sources.push(image);
        sides.push({
          image: images.length - 1,
          title: shot.title ?? (sides.length ? "After" : "Before"),
          ink: shot.ink,
          notes: shot.annotations.map((annotation) => ({
            x: annotation.x,
            y: annotation.y,
            w: annotation.w,
            h: annotation.h,
            // On the page an arrow from the side note points at a `none` mark; a tour has no arrows, so it loops it.
            mark: annotation.mark === "none" ? "circle" : annotation.mark,
            color: annotation.color,
            text: noteText(annotation.note),
            seed: seed(annotation),
          })),
        });
      } catch (error) {
        issues.push(
          `screenshot "${shot.src}": the tour can't load the image (${error instanceof Error ? error.message : String(error)}). Check that the file exists and is a PNG, JPEG, or WebP.`,
        );
      }
    }
    if (sides.length === 2)
      read.push({ caption: compare.caption, before: sides[0]!, after: sides[1]! });
  }
  if (!read.length && !issues.length)
    issues.push(
      "The tour found no `::compare` with two screenshots. Add one, before then after, to make a tour of it.",
    );

  const surface = canvas.createCanvas(width, height);
  const context = surface.getContext("2d");
  const measure = (text: string, size: number) => {
    context.font = `${size}px ${FONT}`;
    return context.measureText(text).width;
  };
  const scene = plan(read, images, measure, width, height);
  const duration = read.length ? scene.duration : 0;
  const paint = (t: number) => drawFrame(context, scene, sources, t, canvas.Path2D);

  return {
    duration,
    fps,
    width,
    height,
    issues,
    shots: scene.shots,
    async frame(t) {
      paint(t);
      return surface.encode("png");
    },
    async sheet(count = 12) {
      const across = 3;
      const tile = { w: Math.round(width / across), h: Math.round(height / across) };
      const rows = Math.ceil(count / across);
      const sheet = canvas.createCanvas(tile.w * across, tile.h * rows);
      const out = sheet.getContext("2d");
      for (let index = 0; index < count; index++) {
        paint(((index + 0.5) / count) * duration);
        out.drawImage(
          surface,
          (index % across) * tile.w,
          Math.floor(index / across) * tile.h,
          tile.w,
          tile.h,
        );
      }
      return sheet.encode("png");
    },
    async write(file, { ffmpeg = "ffmpeg" } = {}) {
      const encoder = spawn(
        ffmpeg,
        // Raw RGBA frames on stdin, encoded as H.264 that every browser plays.
        `-y -loglevel error -f rawvideo -pix_fmt rgba -s ${width}x${height} -r ${fps} -i - -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -movflags +faststart -an`
          .split(" ")
          .concat(file),
        { stdio: ["pipe", "ignore", "pipe"] },
      );
      let errors = "";
      encoder.stderr.on("data", (chunk: Buffer) => (errors += chunk));
      const done = new Promise<void>((resolve, reject) => {
        encoder.on("error", (error) =>
          reject(
            new Error(
              `can't run ${ffmpeg} (${error.message}). Install ffmpeg, or pass its path as ffmpeg.`,
            ),
          ),
        );
        encoder.on("close", (code) =>
          code === 0
            ? resolve()
            : reject(new Error(`ffmpeg exited with ${code}: ${errors.trim()}`)),
        );
      });
      // A write after ffmpeg stopped fails with EPIPE; `done` reports why it stopped.
      encoder.stdin.on("error", () => {});
      let stopped = false;
      const settled = done.then(
        () => (stopped = true),
        () => (stopped = true),
      );
      const frames = Math.ceil(duration * fps);
      for (let index = 0; index < frames && !stopped; index++) {
        paint(index / fps);
        if (!encoder.stdin.write(surface.data()))
          await Promise.race([
            new Promise((resolve) => encoder.stdin.once("drain", resolve)),
            settled,
          ]);
      }
      encoder.stdin.end();
      await done;
    },
  };
}
