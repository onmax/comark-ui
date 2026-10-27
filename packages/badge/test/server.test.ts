import { describe, expect, it, vi } from "vite-plus/test";
import { createBadgeHandler } from "../src/server.ts";

const get = (query: string, method = "GET") =>
  new Request(`https://badges.example/badge.svg?${query}`, { method });
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
// A Cache API that every handler shares, as one Worker location's instances do.
function sharedCache() {
  const stored = new Map<string, Response>();
  const address = (request: RequestInfo | URL) =>
    request instanceof Request ? request.url : String(request);
  return {
    match: async (request: RequestInfo | URL) => stored.get(address(request))?.clone(),
    put: async (request: RequestInfo | URL, response: Response) => {
      stored.set(address(request), response.clone());
    },
  };
}

describe("hosted badge handler", () => {
  it("keeps live data shared across presets while rendering distinct images", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(json({ latest: "1.2.3" }));
    const handle = createBadgeHandler({ fetch });
    const images = [];
    for (const preset of ["default", "npmx", "nuxt"]) {
      const response = await handle(get(`source=npm-version&package=comark-ui&preset=${preset}`));
      expect(response.status).toBe(200);
      images.push(await response.text());
    }
    expect(fetch).toHaveBeenCalledOnce();
    expect(new Set(images).size).toBe(3);
    for (const image of images) expect(image).toContain("v1.2.3");
    expect(images[1]).toContain("Geist Mono");
    expect(images[2]).toContain('fill="#00dc82"');
    const invalid = await handle(get("value=ready&preset=unknown"));
    expect(invalid.status).toBe(400);
    expect(await invalid.text()).toContain("Use preset default, npmx, or nuxt.");
    expect(fetch).toHaveBeenCalledOnce();
  });
  it("renders a self-contained static image, escapes text, and supports HEAD", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const handle = createBadgeHandler({ fetch });
    const query = new URLSearchParams({
      label: '<script>"&',
      value: "stable",
      color: "#ffffff",
      style: "solid",
      icon: "check",
    }).toString();
    const response = await handle(get(query));
    expect(response.headers.get("Content-Type")).toContain("image/svg+xml");
    const svg = await response.text();
    expect(svg).toContain("&lt;script&gt;&quot;&amp;");
    expect(svg).not.toContain("<script>");
    expect(svg).toContain(".v{fill:#000000}");
    // Opened on its own, the image is a document, and its palettes are an inline style.
    expect(response.headers.get("Content-Security-Policy")).toContain("style-src 'unsafe-inline'");
    expect(svg).not.toContain("href=");
    const head = await handle(get(query, "HEAD"));
    expect(head.headers.get("Cache-Control")).toBe(response.headers.get("Cache-Control"));
    expect(await head.text()).toBe("");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fetches live data with Worker-supported redirect handling", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async (_input, init) => {
      if (init?.redirect === "error") throw new TypeError("Unsupported redirect mode");
      return json({ latest: "1.2.3" });
    });
    const response = await createBadgeHandler({ fetch })(
      get("source=npm-version&package=comark-ui"),
    );
    expect(await response.text()).toContain("v1.2.3");
    expect(fetch.mock.calls[0]?.[1]?.redirect).toBe("manual");
  });

  it.each([301, 302, 303, 307, 308])("rejects upstream redirects (%s)", async (status) => {
    const cancel = vi.fn();
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(new ReadableStream({ cancel }), {
        status,
        headers: { Location: "https://unexpected.example/" },
      }),
    );
    const response = await createBadgeHandler({ fetch })(
      get("source=npm-version&package=comark-ui"),
    );
    expect(response.headers.get("X-Badge-Status")).toBe("unavailable");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]?.[1]?.redirect).toBe("manual");
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("rejects invalid options and unsupported methods before fetching", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const handle = createBadgeHandler({ fetch });
    for (const query of [
      "",
      "source=remote&value=x",
      "source=npm-version&package=../secret",
      "value=x&color=url(evil)",
      "value=x&icon=evil",
      "value=x&theme=sepia",
      "source=github-actions&repository=https://example.org&workflow=ci.yml",
      `value=${"x".repeat(81)}`,
      `value=x&junk=${"x".repeat(4096)}`,
    ])
      expect((await handle(get(query))).status, query).toBe(400);
    expect((await handle(get("value=x", "POST"))).status).toBe(405);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fetches scoped versions once per TTL and deduplicates concurrent loads", async () => {
    let time = 0;
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async () => json({ latest: "1.2.3" }));
    const handle = createBadgeHandler({ fetch, now: () => time });
    const query = "source=npm-version&package=@scope/name";
    const [one, two] = await Promise.all([handle(get(query)), handle(get(query))]);
    expect(await one.text()).toContain("v1.2.3");
    expect(await two.text()).toContain("v1.2.3");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]?.[0]).toBe(
      "https://registry.npmjs.org/-/package/%40scope%2Fname/dist-tags",
    );
    const recolored = await handle(get(`${query}&color=error&style=solid`));
    expect(await recolored.text()).toContain('fill="#b91c1c"');
    expect(fetch).toHaveBeenCalledTimes(1);
    time = 100000;
    expect((await handle(get(query))).headers.get("Cache-Control")).toBe(
      "public, max-age=200, stale-while-revalidate=86400",
    );
    time = 300001;
    await handle(get(query));
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("renders downloads including zero, with the selected period", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async () => json({ downloads: 0 }));
    const handle = createBadgeHandler({ fetch });
    const response = await handle(get("source=npm-downloads&package=comark-ui&period=week"));
    expect(await response.text()).toContain("0/wk");
    expect(fetch.mock.calls[0]?.[0]).toBe(
      "https://api.npmjs.org/downloads/point/last-week/comark-ui",
    );
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=3600, stale-while-revalidate=86400",
    );
  });

  it.each([
    ["completed", "success", "passing"],
    ["completed", "failure", "failing"],
    ["completed", "timed_out", "failing"],
    ["completed", "cancelled", "cancelled"],
    ["completed", "skipped", "skipped"],
    ["completed", "new-status", "unavailable"],
    ["new-status", "success", "unavailable"],
  ])("renders workflow %s / %s as %s", async (status, conclusion, expected) => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async () => json({ workflow_runs: [{ status, conclusion }] }));
    const handle = createBadgeHandler({ fetch });
    const response = await handle(
      get("source=github-actions&repository=onmax/comark-ui&workflow=ci.yaml&branch=feat%2Fbadges"),
    );
    expect(await response.text()).toContain(expected!);
    expect(fetch.mock.calls[0]?.[0]).toBe(
      "https://api.github.com/repos/onmax/comark-ui/actions/workflows/ci.yaml/runs?per_page=1&status=completed&branch=feat%2Fbadges",
    );
  });

  it("shows unavailable instead of inventing a successful status, and retries failures", async () => {
    let time = 0;
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(json({ message: "rate limited" }, 429))
      .mockResolvedValueOnce(json({ latest: "2.0.0" }));
    const handle = createBadgeHandler({ fetch, now: () => time });
    const query = "source=npm-version&package=comark-ui";
    const response = await handle(get(query));
    expect(response.headers.get("X-Badge-Status")).toBe("unavailable");
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=30");
    expect(await response.text()).toContain("unavailable");
    await handle(get(query));
    expect(fetch).toHaveBeenCalledTimes(1);
    time = 30001;
    expect(await (await handle(get(query))).text()).toContain("v2.0.0");
  });

  it("contains network, malformed JSON, empty workflow, and oversized response failures", async () => {
    for (const fetch of [
      vi.fn<typeof globalThis.fetch>().mockRejectedValue(new Error("offline")),
      vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response("not json")),
      vi.fn<typeof globalThis.fetch>().mockResolvedValue(json({ workflow_runs: [] })),
      vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response("x".repeat(65537))),
    ]) {
      const handle = createBadgeHandler({ fetch });
      const response = await handle(
        get("source=github-actions&repository=onmax/comark-ui&workflow=ci.yml"),
      );
      expect(response.headers.get("X-Badge-Status")).toBe("unavailable");
      expect(await response.text()).toContain("unavailable");
    }
  });

  it("shares data between instances through the shared cache, whatever the badge's style", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async () => json({ latest: "1.2.3" }));
    const cache = sharedCache();
    await createBadgeHandler({ fetch, cache })(get("source=npm-version&package=comark-ui"));
    const other = await createBadgeHandler({ fetch, cache })(
      get("source=npm-version&package=comark-ui&style=solid&label=release"),
    );
    expect(await other.text()).toContain("v1.2.3");
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("answers with the last good value while it refreshes, and keeps it when the refresh fails", async () => {
    let time = 0;
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(json({ latest: "1.0.0" }))
      .mockResolvedValueOnce(json({ message: "rate limited" }, 429))
      .mockResolvedValueOnce(json({ latest: "2.0.0" }));
    const waitUntil = vi.fn<(promise: Promise<unknown>) => void>();
    const handle = createBadgeHandler({ fetch, now: () => time, cache: sharedCache() });
    const query = "source=npm-version&package=comark-ui";
    await handle(get(query));
    time = 300001;
    const stale = await handle(get(query), { waitUntil });
    expect(await stale.text()).toContain("v1.0.0");
    expect(stale.headers.get("X-Badge-Status")).toBe("ok");
    expect(waitUntil).toHaveBeenCalledOnce();
    await waitUntil.mock.calls[0]![0];
    const kept = await handle(get(query));
    expect(await kept.text()).toContain("v1.0.0");
    expect(fetch).toHaveBeenCalledTimes(2);
    time = 330002;
    await handle(get(query), { waitUntil });
    await waitUntil.mock.calls[1]![0];
    expect(await (await handle(get(query))).text()).toContain("v2.0.0");
  });

  it.each([true, undefined, "false"])(
    "does not expose or share authenticated workflow results without public visibility (%s)",
    async (visibility) => {
      const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async () =>
        json({
          workflow_runs: [
            { status: "completed", conclusion: "success", repository: { private: visibility } },
          ],
        }),
      );
      const cache = sharedCache();
      const query = "source=github-actions&repository=owner/private&workflow=ci.yml";
      for (const token of ["broad-token", undefined]) {
        const response = await createBadgeHandler({ fetch, token, cache })(get(query));
        expect(response.headers.get("X-Badge-Status")).toBe("unavailable");
        expect(await response.text()).not.toContain("passing");
      }
      expect(fetch).toHaveBeenCalledOnce();
    },
  );

  it("ignores shared workflow data cached before visibility validation", async () => {
    const cache = sharedCache();
    const key = JSON.stringify(["github-actions", "", "month", "owner/private", "ci.yml", ""]);
    await cache.put(
      new URL(`/badge-data/${encodeURIComponent(key)}`, "https://badges.example"),
      json({
        result: { value: "passing", color: "success", unavailable: false },
        fresh: Date.now() + 60000,
        kept: Date.now() + 86400000,
      }),
    );
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async () => json({}, 404));
    const response = await createBadgeHandler({ fetch, cache })(
      get("source=github-actions&repository=owner/private&workflow=ci.yml"),
    );
    expect(response.headers.get("X-Badge-Status")).toBe("unavailable");
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("sends the token to GitHub only", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async (url) =>
      typeof url === "string" && url.startsWith("https://api.github.com/")
        ? json({
            workflow_runs: [
              { status: "completed", conclusion: "success", repository: { private: false } },
            ],
          })
        : json({ latest: "1.0.0" }),
    );
    const handle = createBadgeHandler({ fetch, token: "secret" });
    const response = await handle(
      get("source=github-actions&repository=onmax/comark-ui&workflow=ci.yml"),
    );
    expect(response.headers.get("X-Badge-Status")).toBe("ok");
    await handle(get("source=npm-version&package=comark-ui"));
    const authorization = (call: number) =>
      new Headers(fetch.mock.calls[call]?.[1]?.headers).get("Authorization");
    expect(authorization(0)).toBe("Bearer secret");
    expect(authorization(1)).toBeNull();
  });
});
