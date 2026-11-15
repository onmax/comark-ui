import { execFile, execFileSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { describe, expect, it, vi } from "vite-plus/test";
import { plan, toScreen, cameraAt, type TourNote } from "../src/tour/plan.ts";
import * as marks from "../src/marks.ts";
import { tour } from "../src/tour.ts";

// A light page with a dark bar where the change is, as a data URI.
function page(bar: { x: number; y: number }) {
  const canvas = createCanvas(900, 360);
  const context = canvas.getContext("2d");
  context.fillStyle = "#fafafa";
  context.fillRect(0, 0, 900, 360);
  context.fillStyle = "#333";
  context.fillRect(bar.x, bar.y, 180, 40);
  return `data:image/png;base64,${canvas.toBuffer("image/png").toString("base64")}`;
}

const doc = (before = page({ x: 90, y: 72 }), after = page({ x: 450, y: 72 })) => `
## The toolbar fits on one row.

::compare
:::screenshot{src="${before}" alt="Old toolbar" viewport="900x360"}
::::annotation{x=10 y=20 w=20 h=11 mark="circle"}
Filters wrap.
::::
:::

:::screenshot{src="${after}" alt="New toolbar" viewport="900x360"}
::::annotation{x=12 y=20 w=20 h=11 mark="circle"}
One row.
::::

::::annotation{x=50 y=70 w=20 h=11}
Apply moved here.
::::
:::
::
`;

// PNG keeps the image's width and height at bytes 16 to 23.
const size = (png: Uint8Array) => {
  const view = new DataView(png.buffer, png.byteOffset);
  return { width: view.getUint32(16), height: view.getUint32(20) };
};

const hasFfmpeg = (() => {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

describe("tour", () => {
  it("shows marks in one place on both sides through one shot, and the rest on their own", async () => {
    const video = await tour(doc());
    expect(video.issues).toEqual([]);
    expect(video.shots.map(({ side, notes }) => ({ side, notes }))).toEqual([
      { side: "before", notes: ["Filters wrap."] },
      { side: "after", notes: ["One row."] },
      { side: "before", notes: [] },
      { side: "after", notes: ["Apply moved here."] },
    ]);
    expect(video.duration).toBeGreaterThan(video.shots.at(-1)!.end);
  });

  it.each([
    ['x=10 y=20 w=70 h=5 side="top"', "top"],
    ['x=10 y=20 w=70 h=5 side="left" at=80', "bottom"],
  ])("preserves bracket orientation: %s", async (attributes, edge) => {
    const source = page({ x: 90, y: 72 });
    const annotation = `::::annotation{${attributes} mark="bracket"}\nBracket\n::::`;
    const screenshot = `:::screenshot{src="${source}" alt="Page" viewport="900x360"}\n${annotation}\n:::`;
    const video = await tour(`::compare\n${screenshot}\n${screenshot}\n::`);
    const draw = vi.spyOn(marks, "draw");
    try {
      for (const shot of video.shots) await video.frame(shot.end - 0.1);
      await video.frame(video.duration - 1);
      expect(draw.mock.calls.length).toBeGreaterThanOrEqual(3);
      expect(draw.mock.calls.every((call) => call[4] === edge)).toBe(true);
    } finally {
      draw.mockRestore();
    }
  });

  it.each(["before", "after"])("shows both states for %s-only changes", async (side) => {
    const solid = (color: string) => {
      const canvas = createCanvas(1440, 900);
      const context = canvas.getContext("2d");
      context.fillStyle = color;
      context.fillRect(0, 0, 1440, 900);
      return canvas.toDataURL();
    };
    const notes = [10, 50]
      .map((x) => `::::annotation{x=${x} y=20 w=10 h=10}\nChanged\n::::`)
      .join("\n");
    const video = await tour(`::compare
:::screenshot{src="${solid("#ff0000")}" alt="Page" viewport="1440x900"}
${side === "before" ? notes : ""}
:::
:::screenshot{src="${solid("#0000ff")}" alt="Page" viewport="1440x900"}
${side === "after" ? notes : ""}
:::
::`);
    expect(video.issues).toEqual([]);
    expect(video.shots.map((shot) => shot.side)).toEqual(["before", "after", "before", "after"]);
    for (const shot of video.shots) {
      const frame = await loadImage(await video.frame((shot.start + shot.end) / 2));
      const canvas = createCanvas(1920, 1080);
      const context = canvas.getContext("2d");
      context.drawImage(frame, 0, 0);
      const pixel = context.getImageData(960, 540, 1, 1).data;
      expect(Array.from(pixel).slice(0, 3)).toEqual(
        shot.side === "before" ? [255, 0, 0] : [0, 0, 255],
      );
    }
  });

  it("draws frames and a contact sheet at the size asked for", async () => {
    const video = await tour(doc(), { width: 1280, height: 720 });
    expect(size(await video.frame(video.shots[0]!.end - 0.5))).toEqual({
      width: 1280,
      height: 720,
    });
    expect(size(await video.sheet(6))).toEqual({ width: 1281, height: 480 });
  });

  it("names a screenshot it can't load and makes no tour without both sides", async () => {
    const video = await tour(doc(page({ x: 90, y: 72 }), "missing.png"), { base: tmpdir() });
    expect(video.duration).toBe(0);
    expect(video.issues).toEqual([
      expect.stringMatching(/^screenshot "missing\.png": the tour can't load the image/),
    ]);
  });

  it("says when there is nothing to tour", async () => {
    const video = await tour("# Notes\n\nNo screenshots here.");
    expect(video.duration).toBe(0);
    expect(video.issues).toEqual([
      "The tour found no `::compare` with two screenshots. Add one, before then after, to make a tour of it.",
    ]);
  });

  it.skipIf(!hasFfmpeg)("writes an MP4 with ffmpeg", async () => {
    const dir = await mkdtemp(join(tmpdir(), "comark-tour-"));
    const video = await tour(doc(), { width: 640, height: 360, fps: 10 });
    await video.write(join(dir, "tour.mp4"));
    const file = await readFile(join(dir, "tour.mp4"));
    expect(file.subarray(4, 8).toString()).toBe("ftyp");
  });

  it("reports a missing ffmpeg", async () => {
    const video = await tour(doc(), { width: 320, height: 180, fps: 5 });
    await expect(video.write("unused.mp4", { ffmpeg: "no-such-ffmpeg" })).rejects.toThrow(
      /can't run no-such-ffmpeg/,
    );
  });

  it("writes a contact sheet from the CLI", async () => {
    const dir = await mkdtemp(join(tmpdir(), "comark-tour-"));
    await writeFile(join(dir, "pr.md"), doc());
    const { stdout } = await promisify(execFile)(process.execPath, [
      new URL("../dist/cli.mjs", import.meta.url).pathname,
      "tour",
      join(dir, "pr.md"),
      "--sheet",
      join(dir, "sheet.png"),
    ]);
    expect(stdout).toContain("sheet.png");
    expect(size(await readFile(join(dir, "sheet.png"))).width).toBe(1920);
  });
});

describe("tour note layout", () => {
  const image = { width: 1440, height: 900, dark: false };
  const measure = (text: string) => Array.from(text).length * 23;
  const layout = (text: string) => {
    const note: TourNote = { x: 0, y: 0, w: 10, h: 10, mark: "circle", seed: 1, text };
    return plan(
      [
        {
          caption: "",
          before: { image: 0, title: "Before", notes: [note] },
          after: { image: 1, title: "After", notes: [] },
        },
      ],
      [image, image],
      measure,
    );
  };
  it("scores clamped cards without covering the target", () => {
    const scene = layout("A button with another label");
    const mark = scene.marks[0]!;
    const box = toScreen(image, cameraAt(scene, mark.start), mark.box, 1920, 1080);
    const note = mark.note!;
    const x = box.x + note.x;
    const y = box.y + note.y;
    expect(
      x >= box.x + box.w || y >= box.y + box.h || x + note.w <= box.x || y + note.h <= box.y,
    ).toBe(true);
  });
  it.each([
    "https://github.com/onmax/comark-ui/pull/428/files#diff-a37523c8cedfbe1a91ead9e937e6da0f42e7b43294f3cf2e3df08a73474c17e4",
    "漢字".repeat(40),
  ])("wraps unbroken text: %s", (text) => {
    const mark = layout(text).marks[0]!;
    expect(mark.lines.join("")).toBe(text);
    expect(mark.lines.every((line) => measure(line) <= 560)).toBe(true);
    expect(mark.note!.w).toBeLessThan(1920 - 80);
  });
});
