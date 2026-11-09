import { describe, expect, it, vi } from "vite-plus/test";
import { fromAssets } from "../docs/server/utils/assets.ts";

const assets = (response: Response) => ({ fetch: vi.fn().mockResolvedValue(response) });

describe("prerendered files", () => {
  it("serves the file the assets have", async () => {
    const binding = assets(new Response("page"));
    const response = await fromAssets(new Request("https://comark-ui.onmax.me/zoom"), binding);
    expect(await response?.text()).toBe("page");
    expect(binding.fetch).toHaveBeenCalledTimes(1);
  });
  it("hands a path with no file to Nitro", async () => {
    const response = await fromAssets(
      new Request("https://comark-ui.onmax.me/api/auth/get-session"),
      assets(new Response("missing", { status: 404 })),
    );
    expect(response).toBeUndefined();
  });
  it("leaves writes to Nitro without asking the assets", async () => {
    const binding = assets(new Response("page"));
    const post = new Request("https://comark-ui.onmax.me/zoom", { method: "POST" });
    expect(await fromAssets(post, binding)).toBeUndefined();
    expect(binding.fetch).not.toHaveBeenCalled();
  });
  it("gives an agent that asks for Markdown the page's Markdown copy", async () => {
    const binding = {
      fetch: vi.fn(async (request: Request) => new Response(new URL(request.url).pathname)),
    };
    const ask = (path: string) =>
      fromAssets(
        new Request(`https://comark-ui.onmax.me${path}`, { headers: { accept: "text/markdown" } }),
        binding,
      );
    expect(await (await ask("/zoom"))?.text()).toBe("/raw/zoom.md");
    expect(await (await ask("/"))?.text()).toBe("/raw/index.md");
    expect(await (await ask("/before.png"))?.text()).toBe("/before.png");
  });
  it("falls back to the page when there is no Markdown copy", async () => {
    const binding = {
      fetch: vi.fn(async (request: Request) =>
        new URL(request.url).pathname.endsWith(".md")
          ? new Response("missing", { status: 404 })
          : new Response("html"),
      ),
    };
    const response = await fromAssets(
      new Request("https://comark-ui.onmax.me/zoom", { headers: { accept: "text/markdown" } }),
      binding,
    );
    expect(await response?.text()).toBe("html");
  });
});
