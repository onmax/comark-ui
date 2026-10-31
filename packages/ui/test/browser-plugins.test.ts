import { createHtmlRenderer } from "@comark/html";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { browserPlugins, components } from "../../../docs/plugins.ts";

const markdown = [
  "[Docs](https://example.org/docs)",
  ':badge{source="github-actions" repository="onmax/comark-ui" workflow="ci.yml"}',
].join("\n\n");
const render = (...args: Parameters<typeof browserPlugins>) =>
  createHtmlRenderer({ plugins: browserPlugins(...args), components })(markdown);

const fetchStub = () => {
  const fetch = vi.fn(async (url: string) =>
    url.includes("api.github.com")
      ? Response.json({ workflow_runs: [{ status: "completed", conclusion: "success" }] })
      : new Response(new Uint8Array([137, 80, 78, 71]), {
          headers: { "content-type": "image/png" },
        }),
  );
  vi.stubGlobal("fetch", fetch);
  return fetch;
};

describe("browser download policy", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("links chip and badge images instead of downloading them when download is off", async () => {
    const fetch = fetchStub();
    const html = await render({}, { download: false });
    expect(html).toContain('src="https://www.google.com/s2/favicons?domain=example.org&amp;sz=64"');
    expect(html).toContain("https://comark-ui.onmax.me/badge.svg?");
    expect(html).not.toContain("data:image/png");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("downloads chip and badge images by default for static pages", async () => {
    const fetch = fetchStub();
    const html = await render();
    expect(html).toContain('src="data:image/png;base64,');
    expect(html).not.toContain("https://comark-ui.onmax.me/badge.svg?");
    expect(fetch).toHaveBeenCalled();
  });
});
