import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { renderHtmlFromDocument } from "@comark/html";
import { parseMarkdown } from "comark";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import chips, { components } from "../src/html.ts";

const DATA = "data:image/png;base64,iVBORw==";
const PNG = new Uint8Array([137, 80, 78, 71]);

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.reject(new Error("unexpected download"))),
  );
});
afterEach(() => vi.unstubAllGlobals());

async function render(url: string, cache: string | false = false) {
  const document = await parseMarkdown(`[Avatar](https://example.com){avatar="${url}"}`, {
    plugins: [chips({ cache })],
  });
  return { html: await renderHtmlFromDocument(document, { components }), meta: document.meta };
}

function stream(sizes: number[], headers: Record<string, string> = {}, status = 200) {
  let chunks = 0;
  const cancel = vi.fn();
  const body = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        const size = sizes[chunks];
        if (size === undefined) controller.close();
        else {
          chunks++;
          controller.enqueue(new Uint8Array(size).fill(42));
        }
      },
      cancel,
    },
    { highWaterMark: 0 },
  );
  const response = new Response(body, {
    status,
    headers: { "content-type": "image/png", ...headers },
  });
  return { response, cancel, chunks: () => chunks };
}

describe("chip downloads", () => {
  it.each([undefined, "4", "100000"])(
    "stops a chunked image above 100,000 bytes with Content-Length %s",
    async (length) => {
      const url = `https://images.example/oversized-${length}.png`;
      const image = stream(
        [60_000, 40_000, 1, 50_000],
        length === undefined ? {} : { "content-length": length },
      );
      vi.mocked(fetch).mockResolvedValue(image.response);
      const { html, meta } = await render(url);
      expect(html).toContain(`src="${url}"`);
      expect(meta.issues).toEqual([]);
      expect(image.chunks()).toBe(3);
      expect(image.cancel).toHaveBeenCalledOnce();
      expect(image.response.body?.locked).toBe(false);
    },
  );

  it.each([undefined, "100000"])(
    "inlines an image of exactly 100,000 bytes with Content-Length %s",
    async (length) => {
      const image = stream(
        [63_000, 37_000],
        length === undefined ? {} : { "content-length": length },
      );
      vi.mocked(fetch).mockResolvedValue(image.response);
      const { html, meta } = await render(`https://images.example/exact-${length}.png`);
      const encoded = /src="data:image\/png;base64,([^"]+)"/.exec(html)?.[1];
      expect(encoded).toBeDefined();
      expect(Buffer.from(encoded!, "base64")).toEqual(Buffer.alloc(100_000, 42));
      expect(meta.issues).toEqual([]);
      expect(image.chunks()).toBe(2);
      expect(image.cancel).not.toHaveBeenCalled();
      expect(image.response.body?.locked).toBe(false);
    },
  );

  it.each<Record<string, string>>([
    { "content-type": "text/html" },
    { "content-type": "" },
    { "content-length": "100001" },
  ])("rejects headers before reading the body: %o", async (headers) => {
    const url = `https://images.example/reject-${Object.values(headers)[0] || "missing"}.png`;
    const image = stream([100_001], headers);
    vi.mocked(fetch).mockResolvedValue(image.response);
    const { html, meta } = await render(url);
    expect(html).toContain(`src="${url}"`);
    expect(meta.issues).toEqual([]);
    expect(image.chunks()).toBe(0);
    expect(image.cancel).toHaveBeenCalledOnce();
  });

  it.each([404, 429])("preserves HTTP %s and cancels its body", async (status) => {
    const url = `https://images.example/status-${status}.png`;
    const image = stream([100_001], { "content-type": "text/html" }, status);
    image.cancel.mockRejectedValue(new Error("cancel failed"));
    vi.mocked(fetch).mockResolvedValue(image.response);
    const { html, meta } = await render(url);
    expect(meta.issues).toHaveLength(1);
    expect(meta.issues[0]).toContain(`HTTP ${status}`);
    expect(Object.values(meta.issueRules)).toEqual([
      `comark/chips/${status === 429 ? "rate-limited" : "missing-avatar"}`,
    ]);
    if (status === 429) expect(html).toContain(`src="${url}"`);
    else expect(html).not.toContain("<img");
    expect(image.chunks()).toBe(0);
    expect(image.cancel).toHaveBeenCalledOnce();
  });

  it.each(["oversized", "non-image", "missing"])(
    "settles and retries when %s body cancellation never settles",
    async (failure) => {
      const url = `https://images.example/pending-cancel-${failure}.png`;
      const image = stream(
        [100_001],
        failure === "non-image" ? { "content-type": "text/html" } : {},
        failure === "missing" ? 404 : 200,
      );
      image.cancel.mockImplementation(() => new Promise<void>(() => {}));
      vi.mocked(fetch)
        .mockResolvedValueOnce(image.response)
        .mockResolvedValueOnce(new Response(PNG, { headers: { "content-type": "image/png" } }));
      const { html, meta } = await render(url);
      if (failure === "missing") {
        expect(html).not.toContain("<img");
        expect(meta.issues[0]).toContain("HTTP 404");
      } else {
        expect(html).toContain(`src="${url}"`);
        expect(meta.issues).toEqual([]);
      }
      expect(image.cancel).toHaveBeenCalledOnce();
      expect(image.response.body?.locked).toBe(false);
      expect(image.chunks()).toBe(failure === "oversized" ? 1 : 0);
      expect((await render(url)).html).toContain(`src="${DATA}"`);
      expect(fetch).toHaveBeenCalledTimes(2);
    },
    1_000,
  );

  it("retries an oversized image on the next parse and shares the successful download", async () => {
    const url = "https://images.example/retry.png";
    const image = stream([100_001]);
    vi.mocked(fetch)
      .mockResolvedValueOnce(image.response)
      .mockResolvedValueOnce(new Response(PNG, { headers: { "content-type": "image/png" } }));
    expect((await render(url)).html).toContain(`src="${url}"`);
    expect((await render(url)).html).toContain(`src="${DATA}"`);
    expect((await render(url)).html).toContain(`src="${DATA}"`);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("keeps a URL after a stream error and retries even when cancellation rejects", async () => {
    const url = "https://images.example/broken-stream.png";
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.error(new Error("connection closed"));
      },
    });
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(body, { headers: { "content-type": "image/png" } }))
      .mockResolvedValueOnce(new Response(PNG, { headers: { "content-type": "image/png" } }));
    const { html, meta } = await render(url);
    expect(html).toContain(`src="${url}"`);
    expect(meta.issues).toEqual([]);
    expect(body.locked).toBe(false);
    expect((await render(url)).html).toContain(`src="${DATA}"`);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it.each(["oversized", "non-image", "offline", "rate-limited", "missing"])(
    "preserves disk-cache fallback for a stale image when %s",
    async (failure) => {
      const parent = join(import.meta.dirname, "../node_modules/.cache");
      await mkdir(parent, { recursive: true });
      const cache = await mkdtemp(join(parent, "comark-chips-stream-"));
      const url = `https://images.example/stale-${failure}.png`;
      const stored = { [url]: { src: DATA, at: Date.now() - 8 * 24 * 60 * 60 * 1000 } };
      try {
        await writeFile(join(cache, "images.json"), JSON.stringify(stored));
        const image = stream(
          [100_001],
          failure === "non-image" ? { "content-type": "text/html" } : {},
          failure === "rate-limited" ? 429 : failure === "missing" ? 404 : 200,
        );
        if (failure === "offline") vi.mocked(fetch).mockRejectedValue(new Error("offline"));
        else vi.mocked(fetch).mockResolvedValue(image.response);
        const { html, meta } = await render(url, cache);
        if (failure === "missing") {
          expect(html).not.toContain("<img");
          expect(Object.values(meta.issueRules)).toEqual(["comark/chips/missing-avatar"]);
        } else {
          expect(html).toContain(`src="${DATA}"`);
          expect(meta.issues).toEqual([]);
        }
        expect(JSON.parse(await readFile(join(cache, "images.json"), "utf8"))).toEqual(stored);
        vi.mocked(fetch).mockResolvedValue(
          new Response(PNG, { headers: { "content-type": "image/png" } }),
        );
        expect((await render(url, cache)).html).toContain(`src="${DATA}"`);
        expect(JSON.parse(await readFile(join(cache, "images.json"), "utf8"))).toEqual({
          [url]: { src: DATA, at: expect.any(Number) },
        });
        expect(JSON.parse(await readFile(join(cache, "images.json"), "utf8"))).not.toEqual(stored);
        expect(fetch).toHaveBeenCalledTimes(2);
        await render(url, cache);
        expect(fetch).toHaveBeenCalledTimes(2);
      } finally {
        await rm(cache, { recursive: true, force: true });
      }
    },
  );
});
