/** A picture inlined as a data URI, or why it wasn't: past the size cap, or a failed download. */
export type Inlined = { src: string } | { large: true } | { error: string };

class TooLarge extends Error {}

function base64(bytes: Uint8Array) {
  let binary = "";
  for (let at = 0; at < bytes.length; at += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(at, at + 0x8000));
  return btoa(binary);
}

async function download(url: string, limit: number): Promise<string> {
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const type = response.headers.get("content-type")?.split(";", 1)[0]?.trim() ?? "";
    if (!type.startsWith("image/")) throw new Error(`${type || "no content type"}, not an image`);
    if (Number(response.headers.get("content-length")) > limit) throw new TooLarge();
    reader = response.body?.getReader();
    const bytes = new Uint8Array(limit);
    let size = 0;
    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      // Content-Length can be missing, compressed, or wrong, so the bytes received are what count.
      if (value.length > limit - size) throw new TooLarge();
      bytes.set(value, size);
      size += value.length;
    }
    return `data:${type};base64,${base64(bytes.subarray(0, size))}`;
  } finally {
    // An unread body keeps the connection open until it times out.
    await (reader ?? response.body)?.cancel().catch(() => {});
  }
}

// Per process, so every document that shows a post downloads its pictures once. A failed download isn't kept.
const cache = new Map<string, Promise<Inlined>>();

/** Downloads a picture and inlines it, unless it's larger than `limit` bytes. Never throws. */
export function inline(url: string, limit: number): Promise<Inlined> {
  if (url.startsWith("data:")) return Promise.resolve({ src: url });
  const key = `${limit} ${url}`;
  let found = cache.get(key);
  if (!found) {
    found = download(url, limit).then(
      (src): Inlined => ({ src }),
      (error: unknown): Inlined => {
        if (error instanceof TooLarge) return { large: true };
        cache.delete(key);
        return { error: error instanceof Error ? error.message : String(error) };
      },
    );
    cache.set(key, found);
  }
  return found;
}
