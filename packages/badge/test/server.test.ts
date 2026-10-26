import { describe, expect, it, vi } from "vite-plus/test";
import { createBadgeHandler } from "../src/server.ts";

const get = (query: string, method = "GET") =>
  new Request(`https://badges.example/badge.svg?${query}`, { method });
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });

describe("hosted badge handler", () => {
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
    expect((await handle(get(query))).headers.get("Cache-Control")).toBe("public, max-age=200");
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
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=3600");
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
});
