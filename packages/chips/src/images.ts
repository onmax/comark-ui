/** An image ready to draw, or the HTTP status of one that doesn't exist. */
export type Image = { src: string } | { status: number };

const LIMIT = 100_000;
// Avatars change, so a stored image is downloaded again after a week. Until then a build asks no one for it.
const FRESH = 7 * 24 * 60 * 60 * 1000;

class Missing extends Error {
  readonly status: number;
  constructor(status: number) {
    super(`HTTP ${status}`);
    this.status = status;
  }
}

function base64(bytes: Uint8Array) {
  let binary = "";
  for (let at = 0; at < bytes.length; at += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(at, at + 0x8000));
  return btoa(binary);
}

async function download(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    if (!response.ok) throw new Missing(response.status);
    const type = response.headers.get("content-type")?.split(";", 1)[0]?.trim() ?? "";
    if (!type.startsWith("image/") || Number(response.headers.get("content-length")) > LIMIT)
      throw new Error("not a small image");
    reader = response.body?.getReader();
    const bytes = new Uint8Array(LIMIT);
    let size = 0;
    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      // Content-Length can be missing, compressed, or wrong; bound the bytes we actually receive.
      if (value.length > LIMIT - size) throw new Error("not a small image");
      bytes.set(value, size);
      size += value.length;
    }
    return `data:${type};base64,${base64(bytes.subarray(0, size))}`;
  } finally {
    // Cancellation can remain pending; it must not hold up the result or keep the reader locked.
    if (reader) {
      void reader.cancel().catch(() => {});
      reader.releaseLock();
    } else void response.body?.cancel().catch(() => {});
  }
}

// Each image by URL, kept across parses and instances, so a site that builds many pages downloads each once. A failed
// download isn't kept, so the next parse tries again.
const downloaded = new Map<string, Promise<string>>();

type Stored = Record<string, { src: string; at: number }>;
type Files = typeof import("node:fs/promises");

// The specifier is a variable so that bundlers for the browser leave it alone; there the import fails and parsing
// keeps only the cache in memory.
const FS = "node:fs/promises";
let files: Promise<Files | undefined> | undefined;
const loadFiles = () =>
  // SAFETY: FS is the literal "node:fs/promises", so the module is that one whenever the import succeeds.
  (files ??= (import(/* @vite-ignore */ FS) as Promise<Files>).catch(() => undefined));

// Each cache folder's images, read once per process.
const folders = new Map<string, Promise<Stored>>();
let writes = 0;

function read(folder: string) {
  let stored = folders.get(folder);
  if (!stored) {
    stored = loadFiles().then(async (fs) => {
      try {
        const parsed: unknown = JSON.parse(
          (await fs?.readFile(`${folder}/images.json`, "utf8")) ?? "{}",
        );
        // SAFETY: the file is only written by `write` below; anything else is dropped as an empty cache.
        return parsed instanceof Object && !Array.isArray(parsed) ? (parsed as Stored) : {};
      } catch {
        return {};
      }
    });
    folders.set(folder, stored);
  }
  return stored;
}

// Written to a temporary file and renamed, so a build that stops halfway or runs beside another never leaves a file
// that doesn't parse.
async function write(folder: string, stored: Stored) {
  const fs = await loadFiles();
  if (!fs) return;
  const temporary = `${folder}/images.json.${globalThis.process?.pid ?? 0}-${writes++}`;
  try {
    await fs.mkdir(folder, { recursive: true });
    await fs.writeFile(temporary, JSON.stringify(stored));
    await fs.rename(temporary, `${folder}/images.json`);
  } catch {
    await fs.rm(temporary, { force: true }).catch(() => {});
  }
}

/**
 * Downloads each URL and inlines it as a data URI. A URL that answers with an HTTP error maps to its status. Any other
 * failure, such as no network, a browser's CORS rules, or a large image, keeps the URL, so the reader's browser
 * loads it instead. With a `cache` folder, images are stored there between builds, and one that can't be downloaded
 * again keeps its stored copy.
 */
export async function inline(
  urls: Iterable<string>,
  cache?: string | false,
): Promise<Map<string, Image>> {
  const unique = [...new Set(urls)];
  const stored = cache ? await read(cache) : {};
  const now = Date.now();
  let changed = false;
  const images = new Map(
    await Promise.all(
      unique.map(async (url): Promise<[string, Image]> => {
        const kept = stored[url];
        if (kept && now - kept.at < FRESH) return [url, { src: kept.src }];
        let pending = downloaded.get(url);
        if (!pending) {
          pending = download(url);
          downloaded.set(url, pending);
          pending.catch(() => downloaded.delete(url));
        }
        try {
          const src = await pending;
          if (cache) {
            stored[url] = { src, at: now };
            changed = true;
          }
          return [url, { src }];
        } catch (error) {
          const status = error instanceof Missing ? error.status : undefined;
          if (kept && (status === undefined || status === 429)) return [url, { src: kept.src }];
          return [url, status === undefined ? { src: url } : { status }];
        }
      }),
    ),
  );
  if (cache && changed) await write(cache, stored);
  return images;
}
