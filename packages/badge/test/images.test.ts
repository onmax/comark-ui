import { createHtmlRenderer } from "@comark/html";
import { parseMarkdown } from "comark";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import badge, { components } from "../src/html.ts";
import { badgeParams, readBadge } from "../src/svg.ts";
const render = createHtmlRenderer({ plugins: [badge()], components });

describe("image badges", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it("renders static badges locally while keeping prose badges unchanged", async () => {
    const html = await render(
      ':badge[New] :badge[Comark UI]{label="built with" icon="package" color="#15803d"}',
    );
    expect(html).toContain('class="cb" data-color="primary">New</span>');
    expect(html).toContain('class="cb-image" src="data:image/svg+xml,');
    expect(html).toContain('alt="built with: Comark UI"');
    expect(decodeURIComponent(/src="data:image\/svg\+xml,([^"]+)"/.exec(html)![1]!)).toContain(
      "<svg",
    );
  });
  it("defaults image badges to shadcn outlines with self-contained brand logos", async () => {
    for (const icon of ["npm", "github", "comark", "shadcn"]) {
      const html = await render(`:badge[ready]{label="build" icon="${icon}"}`);
      const svg = decodeURIComponent(/src="data:image\/svg\+xml,([^"]+)"/.exec(html)![1]!);
      expect(svg).toContain('font-family="Arial,Helvetica,sans-serif"');
      expect(svg).toContain("stroke:#e5e5e5");
      expect(svg).not.toContain("href=");
      expect(svg).not.toContain("<script");
    }
  });
  it("sizes shadcn text by its letters and shows status as a dot inside a neutral outline", async () => {
    const svgOf = async (markdown: string) =>
      decodeURIComponent(/src="data:image\/svg\+xml,([^"]+)"/.exec(await render(markdown))![1]!);
    const lengths = async (value: string) =>
      Number(/textLength="([\d.]+)"/.exec(await svgOf(`:badge[${value}]{icon="none"}`))![1]);
    expect(await lengths("WWW")).toBeGreaterThan((await lengths("iii")) * 3);
    const passing = await svgOf(':badge[passing]{label="build" color="success" theme="light"}');
    expect(passing).toContain("stroke:#e5e5e5");
    expect(passing).toContain('<circle cx="');
    expect(passing).toContain("fill:#15803d");
    expect(await svgOf(':badge[MIT]{label="license"}')).not.toContain("<circle");
  });
  it("carries both palettes unless a theme is set, so an image follows the page around it", async () => {
    const svgOf = async (markdown: string) =>
      decodeURIComponent(/src="data:image\/svg\+xml,([^"]+)"/.exec(await render(markdown))![1]!);
    for (const style of ["shadcn", "subtle", "solid"]) {
      const auto = await svgOf(`:badge[passing]{label="build" color="success" style="${style}"}`);
      expect(auto).toMatch(/fill:#ffffff.*@media \(prefers-color-scheme:dark\)\{.*fill:#171717/);
      for (const theme of ["light", "dark"]) {
        const fixed = await svgOf(
          `:badge[passing]{label="build" style="${style}" theme="${theme}"}`,
        );
        expect(fixed).not.toContain("prefers-color-scheme");
        expect(fixed).toContain(theme === "dark" ? "fill:#171717" : "fill:#ffffff");
      }
    }
    expect(await svgOf(':badge[passing]{label="build" color="success"}')).toMatch(
      /\.d\{fill:#15803d\}.*\.d\{fill:#4ade80\}/,
    );
  });
  it.each(["light", "dark"])(
    "distinguishes custom gray colors from neutral names in %s images",
    async (theme) => {
      for (const color of ["#525252", "#737373", "primary", "secondary", "neutral"]) {
        const html = await render(`:badge[ready]{label="build" color="${color}" theme="${theme}"}`);
        const svg = decodeURIComponent(/src="data:image\/svg\+xml,([^"]+)"/.exec(html)![1]!);
        if (color.startsWith("#")) {
          expect(svg).toContain(`.d{fill:${color}}`);
        } else {
          expect(svg).not.toContain("<circle");
        }
      }
    },
  );
  it("encodes live badge options in a hosted image when downloads are off", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    vi.stubGlobal("fetch", fetch);
    const hosted = createHtmlRenderer({ plugins: [badge({ download: false })], components });
    const html = await hosted(
      ':badge{source="github-actions" repository="onmax/comark-ui" workflow="ci.yml" branch="feat/new"}',
    );
    expect(html).toContain("https://comark-ui.onmax.me/badge.svg?");
    expect(html).toContain("repository=onmax%2Fcomark-ui");
    expect(html).toContain("branch=feat%2Fnew");
    expect(html).not.toContain("data:image");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("draws live badges from data fetched while parsing, once per process", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(
        async () =>
          new Response(
            JSON.stringify({ workflow_runs: [{ status: "completed", conclusion: "success" }] }),
          ),
      );
    vi.stubGlobal("fetch", fetch);
    const markdown =
      ':badge{source="github-actions" repository="onmax/drawn" workflow="ci.yml" label="build"}';
    const html = await render(`${markdown} ${markdown.replace('label="build"', 'label="ci"')}`);
    expect(html).not.toContain("https://comark-ui.onmax.me/badge.svg");
    const svgs = [...html.matchAll(/src="data:image\/svg\+xml,([^"]+)"/g)].map((match) =>
      decodeURIComponent(match[1]!),
    );
    expect(svgs).toHaveLength(2);
    for (const svg of svgs) expect(svg).toContain("passing");
    expect(html).toContain('alt="build: onmax/drawn / ci.yml"');
    await render(markdown);
    expect(fetch).toHaveBeenCalledOnce();
  });
  it("bounds successful cache entries while reusing recent results", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async () => new Response(JSON.stringify({ latest: "1.0.0" })));
    vi.stubGlobal("fetch", fetch);
    const markdown = (index: number) =>
      `:badge{source="npm-version" package="cache-capacity-${index}"}`;
    for (let index = 0; index < 257; index++) {
      expect(await render(markdown(index))).toContain("data:image/svg+xml,");
    }
    expect(fetch).toHaveBeenCalledTimes(257);
    await render(markdown(256));
    expect(fetch).toHaveBeenCalledTimes(257);
    await render(markdown(0));
    expect(fetch).toHaveBeenCalledTimes(258);
  });
  it("keeps the hosted image when live data is unavailable, and tries again next parse", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response("", { status: 404 }));
    vi.stubGlobal("fetch", fetch);
    const markdown = ':badge{source="npm-version" package="missing-badge-package"}';
    expect(await render(markdown)).toContain("https://comark-ui.onmax.me/badge.svg?");
    fetch.mockResolvedValue(new Response(JSON.stringify({ latest: "1.0.0" })));
    const src = /src="data:image\/svg\+xml,([^"]+)"/.exec(await render(markdown))![1]!;
    expect(decodeURIComponent(src)).toContain("v1.0.0");
  });
  it("uses a custom HTTPS endpoint", async () => {
    const custom = createHtmlRenderer({
      plugins: [badge({ endpoint: "https://example.com/status.svg", download: false })],
      components,
    });
    expect(await custom(':badge{source="npm-version" package="comark-ui"}')).toContain(
      "https://example.com/status.svg?",
    );
  });
  it("reports malformed image options with a linter rule, without throwing", async () => {
    const value = await parseMarkdown(':badge{source="npm-version" package="../oops"}', {
      plugins: [badge()],
    });
    expect(value.meta.issues).toHaveLength(1);
    expect(Object.values(value.meta.issueRules)).toEqual(["comark/badge/invalid-image"]);
    expect(await render(':badge{source="bad"}')).not.toContain("src=");
  });
  it("round-trips builder syntax with quotes, braces, apostrophes, and non-ASCII text", async () => {
    const parsed = readBadge({
      label: "\"Ship\" {it} & say 'hi'",
      value: "日本語 🚀",
      icon: "check",
    });
    if (!parsed.ok) throw new Error(parsed.error);
    const source = `:badge{${[...badgeParams(parsed.value)].map(([key, value]) => `:${key}='${JSON.stringify(value).replaceAll("'", "\\u0027")}'`).join(" ")}}`;
    const document = await parseMarkdown(source, { plugins: [badge()] });
    expect(document.meta.issues).toEqual([]);
    const html = await render(source);
    expect(html).toContain("日本語 🚀");
  });
});
