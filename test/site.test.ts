import { describe, expect, it, vi } from "vite-plus/test";
import { fromAssets, redirectTarget } from "../docs/server/utils/site.ts";

const target = (url: string) => redirectTarget(new URL(url));
const assets = (response: Response) => ({ fetch: vi.fn().mockResolvedValue(response) });

describe("redirects", () => {
  it("sends the old hosts to comark-ui.onmax.me, keeping the query", () => {
    expect(target("https://comark.onmax.me/badge.svg?value=ready")).toBe(
      "https://comark-ui.onmax.me/badge.svg?value=ready",
    );
    expect(target("https://comark.onmax.me/charts/")).toBe("https://comark-ui.onmax.me/charts/");
    expect(target("https://comark-annotate.onmax.me/charts/")).toBe(
      "https://comark-ui.onmax.me/annotate/charts/",
    );
  });
  it("keeps the skill, fonts, and images at their paths on the old hosts", () => {
    expect(target("https://comark-annotate.onmax.me/.well-known/skills/x/SKILL.md")).toBe(
      "https://comark-ui.onmax.me/.well-known/skills/x/SKILL.md",
    );
    expect(target("https://comark-annotate.onmax.me/fonts/Geist-Variable.woff2")).toBe(
      "https://comark-ui.onmax.me/fonts/Geist-Variable.woff2",
    );
    expect(target("https://comark-annotate.onmax.me/before.png")).toBe(
      "https://comark-ui.onmax.me/before.png",
    );
  });
  it("sends the pages that merged or were renamed to their new home", () => {
    expect(target("https://comark-ui.onmax.me/skills/concept-lesson/?x=1#the-idea")).toBe(
      "https://comark-ui.onmax.me/skills/teach-lesson/?x=1#the-idea",
    );
    expect(target("https://comark-ui.onmax.me/skills/concept-lesson.md?x=1#the-idea")).toBe(
      "https://comark-ui.onmax.me/skills/teach-lesson.md?x=1#the-idea",
    );
    expect(target("https://comark-ui.onmax.me/zoom/getting-started/")).toBe(
      "https://comark-ui.onmax.me/zoom/",
    );
    expect(target("https://comark-ui.onmax.me/tabs/guides?x=1")).toBe(
      "https://comark-ui.onmax.me/tabs/?x=1",
    );
    expect(target("https://comark-ui.onmax.me/preset/")).toBe(
      "https://comark-ui.onmax.me/getting-started/",
    );
    expect(target("https://comark-ui.onmax.me/charts/components/gantt")).toBe(
      "https://comark-ui.onmax.me/charts/#gantt-charts",
    );
    expect(target("https://comark-ui.onmax.me/charts/vega-lite/?x=1")).toBe(
      "https://comark-ui.onmax.me/charts/?x=1#vega-lite",
    );
  });
  it.each(["SKILL.md", "agents/openai.yaml", "references/example.md"])(
    "redirects the old installable lesson's %s, keeping the query and fragment",
    (file) => {
      for (const host of ["comark-ui.onmax.me", "comark.onmax.me", "comark-annotate.onmax.me"])
        expect(
          target(`https://${host}/.well-known/skills/concept-lesson/${file}?raw=1#the-idea`),
        ).toBe(`https://comark-ui.onmax.me/.well-known/skills/teach-lesson/${file}?raw=1#the-idea`);
    },
  );
  it("leaves current pages, the linter, the guides, and the badge alone", () => {
    for (const path of [
      "/",
      "/zoom/",
      "/lint/getting-started/",
      "/guide/theming/",
      "/badge.svg",
      "/.well-known/skills/teach-lesson/SKILL.md",
      "/.well-known/skills/concept-lesson-extra/SKILL.md",
    ])
      expect(target(`https://comark-ui.onmax.me${path}`)).toBeUndefined();
  });
});

describe("prerendered files", () => {
  it("serves the file the assets have", async () => {
    const binding = assets(new Response("page"));
    const response = await fromAssets(new Request("https://comark-ui.onmax.me/zoom/"), binding);
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
    const post = new Request("https://comark-ui.onmax.me/zoom/", { method: "POST" });
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
    expect(await (await ask("/zoom/"))?.text()).toBe("/zoom.md");
    expect(await (await ask("/"))?.text()).toBe("/index.md");
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
      new Request("https://comark-ui.onmax.me/zoom/", { headers: { accept: "text/markdown" } }),
      binding,
    );
    expect(await response?.text()).toBe("html");
  });
});
