/** A picture's or a video's size in pixels, as the browser lays it out before it scales it to the page. */
export type Size = { width: number; height: number };

// Every format here says its size in its first bytes, except an MP4 whose index sits after the video.
const HEAD = 65_536;
const TIMEOUT = 5_000;

const ascii = (bytes: Uint8Array, at: number, length: number) =>
  String.fromCharCode(...bytes.subarray(at, at + length));
const u16 = (bytes: Uint8Array, at: number) => (bytes[at]! << 8) | bytes[at + 1]!;
const u32 = (bytes: Uint8Array, at: number) => u16(bytes, at) * 0x10000 + u16(bytes, at + 2);
const le16 = (bytes: Uint8Array, at: number) => bytes[at]! | (bytes[at + 1]! << 8);
const le24 = (bytes: Uint8Array, at: number) => le16(bytes, at) | (bytes[at + 2]! << 16);
const sized = (width: number, height: number, turned = false): Size | undefined => {
  if (!(width >= 1 && height >= 1 && Number.isFinite(width) && Number.isFinite(height)))
    return undefined;
  const size = { width: Math.round(width), height: Math.round(height) };
  return turned ? { width: size.height, height: size.width } : size;
};

function png(bytes: Uint8Array) {
  return ascii(bytes, 12, 4) === "IHDR" ? sized(u32(bytes, 16), u32(bytes, 20)) : undefined;
}

function gif(bytes: Uint8Array) {
  return sized(le16(bytes, 6), le16(bytes, 8));
}

function webp(bytes: Uint8Array) {
  const chunk = ascii(bytes, 12, 4);
  if (chunk === "VP8X") return sized(le24(bytes, 24) + 1, le24(bytes, 27) + 1);
  if (chunk === "VP8 ") return sized(le16(bytes, 26) & 0x3fff, le16(bytes, 28) & 0x3fff);
  if (chunk !== "VP8L") return undefined;
  const [a, b, c, d] = bytes.subarray(21, 25);
  return sized(
    1 + (((b! & 0x3f) << 8) | a!),
    1 + (((d! & 0xf) << 10) | (c! << 2) | ((b! & 0xc0) >> 6)),
  );
}

// An EXIF orientation of 5 to 8 turns the photo a quarter, and browsers show it turned.
function turnedByExif(bytes: Uint8Array, at: number, end: number) {
  if (ascii(bytes, at, 6) !== "Exif\0\0") return false;
  const tiff = at + 6;
  const little = ascii(bytes, tiff, 2) === "II";
  const read16 = (offset: number) => (little ? le16(bytes, offset) : u16(bytes, offset));
  const read32 = (offset: number) =>
    little ? read16(offset) + read16(offset + 2) * 0x10000 : u32(bytes, offset);
  const ifd = tiff + read32(tiff + 4);
  for (let entry = 0, count = read16(ifd); entry < count; entry++) {
    const offset = ifd + 2 + entry * 12;
    if (offset + 12 > end) return false;
    if (read16(offset) === 0x0112) return read16(offset + 8) >= 5;
  }
  return false;
}

function jpeg(bytes: Uint8Array) {
  let turned = false;
  for (let at = 2; at + 9 < bytes.length;) {
    if (bytes[at] !== 0xff) return undefined;
    const marker = bytes[at + 1]!;
    if (marker === 0xff) {
      at++;
      continue;
    }
    const length = u16(bytes, at + 2);
    if (marker === 0xe1) turned ||= turnedByExif(bytes, at + 4, at + 2 + length);
    // SOF0 to SOF15 hold the size; C4, C8, and CC are other tables that share the range.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc)
      return sized(u16(bytes, at + 7), u16(bytes, at + 5), turned);
    at += 2 + length;
  }
  return undefined;
}

const pixels = (value: string | undefined) => {
  const match = value && /^\s*([\d.]+)\s*(px)?\s*$/.exec(value);
  return match ? Number(match[1]) : undefined;
};

function svg(bytes: Uint8Array) {
  // Only a file that starts as SVG: an HTML page that answered instead may hold an icon's `<svg>`.
  const tag =
    /^\uFEFF?\s*(?:<\?xml[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*|<!DOCTYPE[^>]*>\s*)*(<svg\b[^>]*>)/i.exec(
      new TextDecoder().decode(bytes),
    )?.[1];
  if (!tag) return undefined;
  const attribute = (name: string) =>
    new RegExp(`\\s${name}\\s*=\\s*(["'])(.*?)\\1`, "i").exec(tag)?.[2];
  const width = pixels(attribute("width"));
  const height = pixels(attribute("height"));
  if (width && height) return sized(width, height);
  const box = attribute("viewBox")
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  if (box?.length !== 4) return undefined;
  const [, , boxWidth = 0, boxHeight = 0] = box;
  // One length with a viewBox keeps the box's ratio.
  if (width) return sized(width, (width * boxHeight) / boxWidth);
  if (height) return sized((height * boxWidth) / boxHeight, height);
  return sized(boxWidth, boxHeight);
}

/** Where the next box starts after the one at `at`, and its type, or nothing past the bytes we have. */
function box(bytes: Uint8Array, at: number, base: number) {
  if (at - base + 8 > bytes.length) return undefined;
  const local = at - base;
  let size = u32(bytes, local);
  let header = 8;
  if (size === 1) {
    if (local + 16 > bytes.length) return undefined;
    size = u32(bytes, local + 8) * 0x1_0000_0000 + u32(bytes, local + 12);
    header = 16;
  }
  const type = ascii(bytes, local + 4, 4);
  // Size 0 runs to the end of the file, which only the last box does.
  return { type, start: at + header, end: size === 0 ? Infinity : at + size };
}

// The first track with a size is the video; sound tracks are 0 by 0. A matrix that turns it a quarter swaps the sides,
// as phones record portrait video. `end` can cut a box short when the index runs past the bytes read.
function trackSize(bytes: Uint8Array, start: number, end: number): Size | undefined {
  for (let at = start; at < end;) {
    const child = box(bytes, at, 0);
    if (!child) return undefined;
    const stop = Math.min(child.end, end);
    if (child.type === "trak") {
      const found = trackSize(bytes, child.start, stop);
      if (found) return found;
    } else if (child.type === "tkhd") {
      const matrix = child.start + (bytes[child.start] === 1 ? 36 : 24) + 16;
      if (matrix + 44 > stop) return undefined;
      const width = u32(bytes, matrix + 36) / 0x10000;
      const height = u32(bytes, matrix + 40) / 0x10000;
      return sized(width, height, u32(bytes, matrix) === 0 && u32(bytes, matrix + 4) !== 0);
    }
    at = child.end;
  }
  return undefined;
}

// The biggest of a picture's `ispe` properties is the picture; the others are its tiles and thumbnail.
function ispe(bytes: Uint8Array) {
  let best: Size | undefined;
  for (let i = 0; i + 16 <= bytes.length; i++) {
    if (ascii(bytes, i, 4) !== "ispe") continue;
    const size = sized(u32(bytes, i + 8), u32(bytes, i + 12));
    if (size && (!best || size.width * size.height > best.width * best.height)) best = size;
  }
  return best;
}

// `more` reads bytes from an offset, for an MP4 whose `moov` index comes after its media.
async function isoBmff(
  bytes: Uint8Array,
  more?: (from: number) => Promise<Uint8Array | undefined>,
) {
  let base = 0;
  let chunk = bytes;
  for (let at = 0, hops = 0; hops < 4;) {
    const next = box(chunk, at, base);
    // A box that starts past the bytes read, or the index cut short, is read from its own start.
    if (!next || (next.type === "moov" && at > base && next.end > base + chunk.length)) {
      const read = more && (await more(at));
      if (!read) return undefined;
      base = at;
      chunk = read;
      hops++;
      continue;
    }
    const content = chunk.subarray(next.start - base, next.end - base);
    if (next.type === "moov") return trackSize(content, 0, content.length);
    // An AVIF or HEIC picture says its size in an `ispe` property inside `meta`.
    if (next.type === "meta") return ispe(content);
    if (!Number.isFinite(next.end)) return undefined;
    at = next.end;
  }
  return undefined;
}

// EBML ids keep their length marker; sizes drop it. A size of all ones is unknown, as a live recording writes.
function vint(bytes: Uint8Array, at: number, keepMarker: boolean) {
  const first = bytes[at];
  if (!first) return undefined;
  let width = 1;
  while (width <= 8 && !(first & (0x80 >> (width - 1)))) width++;
  if (width > 8 || at + width > bytes.length) return undefined;
  let value = keepMarker ? first : first & (0xff >> width);
  let ones = value === 0xff >> width;
  for (let i = 1; i < width; i++) {
    value = value * 256 + bytes[at + i]!;
    ones &&= bytes[at + i] === 0xff;
  }
  return { value, width, unknown: !keepMarker && ones };
}

const SEGMENT = 0x18538067;
const TRACKS = 0x1654ae6b;
const ENTRY = 0xae;
const VIDEO = 0xe0;
const PARENTS = new Set([SEGMENT, TRACKS, ENTRY, VIDEO]);
type Side = keyof Size | `display-${keyof Size}`;
const SIDES = new Map<number, Side>([
  [0xb0, "width"],
  [0xba, "height"],
  [0x54b0, "display-width"],
  [0x54ba, "display-height"],
]);

// The first video track's display size, or its pixels when it has none.
function webm(bytes: Uint8Array) {
  const found: Partial<Record<Side, number>> = {};
  for (let at = 0; at < bytes.length;) {
    const id = vint(bytes, at, true);
    const size = id && vint(bytes, at + id.width, false);
    if (!id || !size) break;
    const start = at + id.width + size.width;
    const side = SIDES.get(id.value);
    if (side && found[side] === undefined) {
      if (size.unknown || size.value < 1 || size.value > 8 || size.value > bytes.length - start)
        return undefined;
      let value = 0;
      for (let i = 0; i < size.value; i++) value = value * 256 + bytes[start + i]!;
      found[side] = value;
    }
    // A parent's children follow its header; anything else is skipped whole.
    at = PARENTS.has(id.value) || size.unknown ? start : start + size.value;
  }
  return (
    sized(found["display-width"] ?? 0, found["display-height"] ?? 0) ??
    sized(found.width ?? 0, found.height ?? 0)
  );
}

const BMFF = new Set(["ftyp", "moov", "mdat", "wide", "free", "skip"]);

/**
 * Reads a picture's or a video's size from its first bytes: PNG, JPEG, GIF, WebP, SVG, AVIF, MP4, MOV, and WebM.
 * `more` reads further on, from a byte offset, for an MP4 whose index comes after its media.
 */
export async function sizeOf(
  bytes: Uint8Array,
  more?: (from: number) => Promise<Uint8Array | undefined>,
): Promise<Size | undefined> {
  if (bytes[0] === 0x89 && ascii(bytes, 1, 3) === "PNG") return png(bytes);
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return jpeg(bytes);
  if (ascii(bytes, 0, 4) === "GIF8") return gif(bytes);
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return webp(bytes);
  if (u32(bytes, 0) === 0x1a45dfa3) return webm(bytes);
  // A QuickTime file can start with its media or index, without `ftyp`.
  if (BMFF.has(ascii(bytes, 4, 4))) return isoBmff(bytes, more);
  return svg(bytes.subarray(0, 4096));
}

/** Up to `HEAD` bytes from `from`, by a range request; a server that ignores the range sends the file from its start. */
async function download(src: string, from: number) {
  const response = await fetch(src, {
    headers: { range: `bytes=${from}-${from + HEAD - 1}` },
    signal: AbortSignal.timeout(TIMEOUT),
  });
  const reader = response.body?.getReader();
  try {
    if (!response.ok || (from > 0 && response.status !== 206)) return undefined;
    const bytes = new Uint8Array(HEAD);
    let size = 0;
    while (reader && size < HEAD) {
      const { done, value } = await reader.read();
      if (done) break;
      const part = value.subarray(0, HEAD - size);
      bytes.set(part, size);
      size += part.length;
    }
    return bytes.subarray(0, size);
  } finally {
    // The rest of a file that ignored the range isn't needed; cancelling can stay pending without holding up the size.
    if (reader) {
      void reader.cancel().catch(() => {});
      reader.releaseLock();
    } else void response.body?.cancel().catch(() => {});
  }
}

function decode(src: string) {
  const comma = src.indexOf(",");
  const head = src.slice(comma + 1, comma + 1 + Math.ceil((HEAD * 4) / 3));
  if (!/;base64$/i.test(src.slice(0, comma)))
    return new TextEncoder().encode(decodeURIComponent(head));
  const binary = atob(head.slice(0, head.length - (head.length % 4)));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

// Each file by URL, kept across parses, so a site that builds many pages reads each once. A failed read isn't kept, so
// the next parse tries again.
const measured = new Map<string, Promise<Size | undefined>>();

/**
 * The size of a picture or video in a data URI. `{ remote: true }` also reads HTTP(S) URLs with range requests.
 * Only enable remote reads for trusted sources: requests can follow redirects and reach private networks.
 * Nothing for a relative path, a format it doesn't know, or a file that doesn't answer within 5 seconds.
 */
export function measure(src: string, options?: { remote?: boolean }): Promise<Size | undefined> {
  if (src.startsWith("data:"))
    return Promise.resolve(src)
      .then((data) => sizeOf(decode(data)))
      .catch(() => undefined);
  if (options?.remote !== true || !/^https?:\/\//i.test(src)) return Promise.resolve(undefined);
  let size = measured.get(src);
  if (!size) {
    size = download(src, 0)
      .then((bytes) => (bytes ? sizeOf(bytes, (from) => download(src, from)) : undefined))
      .then((result) => {
        if (!result) measured.delete(src);
        return result;
      });
    measured.set(src, size);
    size.catch(() => measured.delete(src));
  }
  return size.catch(() => undefined);
}
