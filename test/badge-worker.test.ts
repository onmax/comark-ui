import { describe, expect, it, vi } from "vite-plus/test";
import worker from "../docs/worker.ts";

describe("badge Worker route", () => {
  it("serves SVGs before static assets", async () => {
    const assets = vi.fn().mockResolvedValue(new Response("asset"));
    const response = await worker.fetch(
      new Request("https://comark-ui.onmax.me/badge.svg?label=build&value=ready"),
      { ASSETS: { fetch: assets } },
    );
    expect(response.headers.get("content-type")).toContain("image/svg+xml");
    expect(await response.text()).toContain("build: ready");
    expect(assets).not.toHaveBeenCalled();
  });
  it("keeps static asset serving and legacy redirects", async () => {
    const assets = vi.fn().mockResolvedValue(new Response("builder"));
    const response = await worker.fetch(new Request("https://comark-ui.onmax.me/badges/"), {
      ASSETS: { fetch: assets },
    });
    expect(await response.text()).toBe("builder");
    expect(assets).toHaveBeenCalledTimes(1);
    const redirect = await worker.fetch(
      new Request("https://comark.onmax.me/badge.svg?value=ready"),
      { ASSETS: { fetch: assets } },
    );
    expect(redirect.status).toBe(301);
    expect(redirect.headers.get("location")).toBe(
      "https://comark-ui.onmax.me/badge.svg?value=ready",
    );
  });
});
