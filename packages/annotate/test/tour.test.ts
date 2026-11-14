import { execFile, execFileSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vite-plus/test";
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
      { side: "after", notes: ["Apply moved here."] },
    ]);
    expect(video.duration).toBeGreaterThan(video.shots.at(-1)!.end);
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
