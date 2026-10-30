import { execFileSync } from "node:child_process";
import { createHtmlRenderer } from "@comark/html";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import zoom, { components } from "../src/html.ts";
import { measure, sizeOf } from "../src/size.ts";

const bytes = (...parts: (number[] | string | Uint8Array)[]) =>
  new Uint8Array(
    parts.flatMap((part) =>
      typeof part === "string" ? [...new TextEncoder().encode(part)] : [...part],
    ),
  );
const be = (value: number, length: number) =>
  Array.from({ length }, (_, i) => Math.floor(value / 256 ** (length - 1 - i)) % 256);
const le = (value: number, length: number) => be(value, length).reverse();
const box = (type: string, ...payload: (number[] | string | Uint8Array)[]) => {
  const content = bytes(...payload);
  return bytes(be(content.length + 8, 4), type, content);
};
// A track header, version 0: 24 bytes of times and ids, 16 of layer and volume, the matrix, then 16.16 sides.
const tkhd = (
  width: number,
  height: number,
  matrix = [0x10000, 0, 0, 0, 0x10000, 0, 0, 0, 0x40000000],
) =>
  box(
    "tkhd",
    Array(24).fill(0),
    Array(16).fill(0),
    ...matrix.map((n) => be(n >>> 0, 4)),
    be(width * 0x10000, 4),
    be(height * 0x10000, 4),
  );
const ebml = (id: number[], content: Uint8Array | number[]) =>
  bytes(id, [0x80 | content.length], [...content]);

const png = bytes(
  [0x89],
  "PNG\r\n\x1a\n",
  be(13, 4),
  "IHDR",
  be(2560, 4),
  be(1600, 4),
  Array(5).fill(0),
);

describe("sizeOf", () => {
  it("reads pictures", async () => {
    expect(await sizeOf(png)).toEqual({ width: 2560, height: 1600 });
    expect(await sizeOf(bytes("GIF89a", le(320, 2), le(240, 2)))).toEqual({
      width: 320,
      height: 240,
    });
    expect(
      await sizeOf(
        bytes("RIFF", Array(4).fill(0), "WEBPVP8X", Array(8).fill(0), le(1919, 3), le(1079, 3)),
      ),
    ).toEqual({ width: 1920, height: 1080 });
    expect(
      await sizeOf(
        bytes("RIFF", Array(4).fill(0), "WEBPVP8 ", Array(10).fill(0), le(800, 2), le(600, 2)),
      ),
    ).toEqual({ width: 800, height: 600 });
    // VP8L packs width - 1 and height - 1 in 14 bits each: 99 and 49.
    expect(
      await sizeOf(
        bytes("RIFF", Array(4).fill(0), "WEBPVP8L", Array(4).fill(0), [
          0x2f,
          99,
          (49 & 3) << 6,
          49 >> 2,
          0,
        ]),
      ),
    ).toEqual({ width: 100, height: 50 });
  });

  it("reads a JPEG's frame, turned when its EXIF orientation is a quarter turn", async () => {
    const frame = bytes([0xff, 0xc0], be(17, 2), [8], be(3000, 2), be(4000, 2), Array(12).fill(0));
    const exif = (orientation: number) => {
      const tiff = bytes(
        "MM",
        be(42, 2),
        be(8, 4),
        be(1, 2),
        be(0x0112, 2),
        be(3, 2),
        be(1, 4),
        be(orientation, 2),
        [0, 0],
        be(0, 4),
      );
      return bytes([0xff, 0xe1], be(tiff.length + 8, 2), "Exif\0\0", tiff);
    };
    expect(await sizeOf(bytes([0xff, 0xd8], exif(1), frame))).toEqual({
      width: 4000,
      height: 3000,
    });
    expect(await sizeOf(bytes([0xff, 0xd8], exif(6), frame))).toEqual({
      width: 3000,
      height: 4000,
    });
  });

  it("reads an SVG's sides or its viewBox, and no HTML page", async () => {
    const svg = (text: string) => sizeOf(new TextEncoder().encode(text));
    expect(await svg('<?xml version="1.0"?>\n<svg width="120" height="80px">')).toEqual({
      width: 120,
      height: 80,
    });
    expect(await svg('<svg viewBox="0 0 1440 900.4" width="100%">')).toEqual({
      width: 1440,
      height: 900,
    });
    expect(await svg('<svg width="720" viewBox="0 0 1440 900">')).toEqual({
      width: 720,
      height: 450,
    });
    expect(await svg('<!doctype html><html><svg width="16" height="16">')).toBeUndefined();
  });

  it("reads an AVIF's biggest ispe", async () => {
    const ispe = (width: number, height: number) =>
      box("ispe", [0, 0, 0, 0], be(width, 4), be(height, 4));
    const avif = bytes(
      box("ftyp", "avif", [0, 0, 0, 0]),
      box("meta", [0, 0, 0, 0], ispe(512, 512), ispe(2048, 1536)),
    );
    expect(await sizeOf(avif)).toEqual({ width: 2048, height: 1536 });
  });

  it("reads an MP4's video track, past its audio and its media", async () => {
    const moov = box(
      "moov",
      box("mvhd", Array(100).fill(0)),
      box("trak", tkhd(0, 0)),
      box("trak", tkhd(1920, 1080)),
    );
    const ftyp = box("ftyp", "isom", [0, 0, 0, 0]);
    expect(await sizeOf(bytes(ftyp, moov))).toEqual({ width: 1920, height: 1080 });
    // The media comes first, so the index is read from where it starts.
    const mdat = bytes(be(1_000_000, 4), "mdat");
    const file = bytes(ftyp, mdat);
    const reads: number[] = [];
    expect(
      await sizeOf(file, async (from) => {
        reads.push(from);
        return moov;
      }),
    ).toEqual({ width: 1920, height: 1080 });
    expect(reads).toEqual([ftyp.length + 1_000_000]);
  });

  it("swaps a phone video's sides when its matrix turns it a quarter", async () => {
    const turned = tkhd(1920, 1080, [0, 0x10000, 0, -0x10000, 0, 0, 0, 0, 0x40000000]);
    const file = bytes(box("ftyp", "qt  ", [0, 0, 0, 0]), box("moov", box("trak", turned)));
    expect(await sizeOf(file)).toEqual({ width: 1080, height: 1920 });
  });

  it("reads a WebM's first video track, with a segment of unknown size", async () => {
    const video = ebml([0xe0], bytes(ebml([0xb0], be(1280, 2)), ebml([0xba], be(720, 2))));
    const tracks = ebml([0x16, 0x54, 0xae, 0x6b], ebml([0xae], bytes(ebml([0xd7], [1]), video)));
    const file = bytes(
      ebml(
        [0x1a, 0x45, 0xdf, 0xa3],
        ebml(
          [0x42, 0x82],
          "webm".split("").map((c) => c.charCodeAt(0)),
        ),
      ),
      [0x18, 0x53, 0x80, 0x67, 0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff],
      ebml([0x15, 0x49, 0xa9, 0x66], [0, 0, 0]),
      tracks,
    );
    expect(await sizeOf(file)).toEqual({ width: 1280, height: 720 });
  });

  it("reads nothing it doesn't know", async () => {
    expect(await sizeOf(new TextEncoder().encode("Not Found"))).toBeUndefined();
  });

  it("rejects unknown, oversized, empty, and truncated WebM integer payloads", async () => {
    // A child process bounds this regression: the original 14-byte file blocks the event loop.
    const source = new URL("../src/size.ts", import.meta.url).href;
    const output = execFileSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "--input-type=module",
        "-e",
        `
        import { sizeOf } from ${JSON.stringify(source)};
        console.log(await sizeOf(Uint8Array.from(Buffer.from('1a45dfa380b001ffffffffffffff', 'hex'))));
      `,
      ],
      { timeout: 2000, encoding: "utf8" },
    );
    expect(output.trim()).toBe("undefined");
    const header = ebml([0x1a, 0x45, 0xdf, 0xa3], []);
    const height = ebml([0xba], be(720, 2));
    for (const width of [ebml([0xb0], Array(9).fill(1)), ebml([0xb0], [])])
      expect(await sizeOf(bytes(header, width, height))).toBeUndefined();
    expect(await sizeOf(bytes(header, height, [0xb0, 0x82, 5]))).toBeUndefined();
  });
});

describe("measure", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("makes no remote requests without host opt-in, even for a cached URL", async () => {
    const fetch = vi.fn(async () => new Response(png));
    vi.stubGlobal("fetch", fetch);
    for (const src of [
      "http://127.0.0.1/private",
      "http://169.254.169.254/latest",
      "https://example.com/no-opt-in.png",
    ])
      expect(await measure(src)).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
    const src = "https://example.com/opt-in.png";
    expect(await measure(src, { remote: true })).toEqual({ width: 2560, height: 1600 });
    expect(await measure(src)).toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("asks for the first bytes once per URL, and skips relative paths", async () => {
    const fetch = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(new Headers(init?.headers).get("range")).toBe("bytes=0-65535");
      return new Response(png, { status: 206 });
    });
    vi.stubGlobal("fetch", fetch);
    expect(await measure("https://example.com/once.png", { remote: true })).toEqual({
      width: 2560,
      height: 1600,
    });
    expect(await measure("https://example.com/once.png", { remote: true })).toEqual({
      width: 2560,
      height: 1600,
    });
    expect(await measure("./shot.png")).toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("reads a data URI without asking anyone", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const base64 = btoa(String.fromCharCode(...png));
    expect(await measure(`data:image/png;base64,${base64}`)).toEqual({ width: 2560, height: 1600 });
    expect(await measure('data:image/svg+xml,%3Csvg width="10" height="20"%3E')).toEqual({
      width: 10,
      height: 20,
    });
  });

  it("tries again after a failure", async () => {
    let fail = true;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        if (fail) throw new Error("offline");
        return new Response(png);
      }),
    );
    expect(await measure("https://example.com/retry.png", { remote: true })).toBeUndefined();
    fail = false;
    expect(await measure("https://example.com/retry.png", { remote: true })).toEqual({
      width: 2560,
      height: 1600,
    });
  });

  it.each(["http", "format", "timeout"])("retries after a %s failure", async (failure) => {
    const fetch = vi
      .fn()
      .mockImplementationOnce(async () => {
        if (failure === "http") return new Response("unavailable", { status: 503 });
        if (failure === "format") return new Response("not media");
        throw new DOMException("Timed out", "TimeoutError");
      })
      .mockImplementation(async () => new Response(png));
    vi.stubGlobal("fetch", fetch);
    const src = `https://example.com/retry-${failure}.png`;
    expect(await measure(src, { remote: true })).toBeUndefined();
    expect(await measure(src, { remote: true })).toEqual({ width: 2560, height: 1600 });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe("comark-zoom sizes", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  const render = (markdown: string, options?: Parameters<typeof zoom>[0]) =>
    createHtmlRenderer({ plugins: [zoom(options)], components })(markdown);

  it("measures data URIs by default and requires host opt-in for remote images", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(await render("![Internal](http://127.0.0.1/private.png){size=true}")).not.toMatch(
      /<img[^>]* width=/,
    );
    const inline = `![Shot](data:image/png;base64,${btoa(String.fromCharCode(...png))})`;
    expect(await render(inline)).toMatch(/<img[^>]* width="2560" height="1600"/);
    expect(await render(inline, { size: false })).not.toMatch(/<img[^>]* width=/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("gives a remote image its width and height, and keeps the sides an author set", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(png)),
    );
    expect(await render("![Shot](https://example.com/a.png)", { size: true })).toMatch(
      /<img src="https:\/\/example.com\/a.png" alt="Shot"[^>]* width="2560" height="1600">/,
    );
    expect(await render("![Shot](https://example.com/b.png){width=640}", { size: true })).toMatch(
      /width="640"[^>]* height="400"/,
    );
    expect(
      await render("![Shot](https://example.com/c.png){width=50%}", { size: true }),
    ).not.toMatch(/<img[^>]* height=/);
    expect(await render("![Shot](https://example.com/d.png)", { size: false })).not.toMatch(
      /<img[^>]* width=/,
    );
  });
});
