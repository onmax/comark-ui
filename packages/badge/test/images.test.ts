import { createHtmlRenderer } from "@comark/html";
import { parseMarkdown } from "comark";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import badge, { components } from "../src/html.ts";
import { createBadgeHandler } from "../src/server.ts";
import { badgeParams, badgeSvg, readBadge, type BadgeSpec } from "../src/svg.ts";
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
    for (const icon of ["npm", "npmx", "nuxt", "github", "comark", "shadcn"]) {
      const html = await render(`:badge[ready]{label="build" icon="${icon}"}`);
      const svg = decodeURIComponent(/src="data:image\/svg\+xml,([^"]+)"/.exec(html)![1]!);
      expect(svg).toContain('font-family="Arial,Helvetica,sans-serif"');
      expect(svg).toContain("stroke:#e5e5e5");
      expect(svg).not.toContain("href=");
      expect(svg).not.toContain("<script");
    }
  });
  it("renders branded presets locally and keeps the default appearance", async () => {
    const svgOf = async (markdown: string) =>
      decodeURIComponent(/src="data:image\/svg\+xml,([^"]+)"/.exec(await render(markdown))![1]!);
    const npmx = await svgOf(':badge[v1.2.3]{label="npm" preset="npmx" icon="npmx"}');
    expect(npmx).toContain("Geist Mono");
    expect(npmx).toContain("stroke:#0066b8");
    expect(npmx).toMatch(/prefers-color-scheme:dark.*stroke:#51c8fc/);
    const nuxt = await svgOf(':badge[v1.2.3]{label="npm" preset="nuxt" icon="nuxt"}');
    expect(nuxt).toContain('fill="#020420"');
    expect(nuxt).toContain('fill="#00dc82"');
    expect(await svgOf(':badge[failing]{label="build" preset="nuxt" color="error"}')).toContain(
      'fill="#f87171"',
    );
    for (const style of ["shadcn", "subtle", "solid"])
      expect(await svgOf(`:badge[ready]{label="build" style="${style}" preset="default"}`)).toBe(
        await svgOf(`:badge[ready]{label="build" style="${style}"}`),
      );
    expect(await svgOf(':badge[ready]{preset="nuxt" icon="none" color="#000000"}')).toContain(
      'fill="#ffffff"',
    );
    expect(npmx + nuxt).not.toMatch(/<script|href=/);
  });
  it("draws Shields.io's flat and for-the-badge looks with readable text", async () => {
    const svgOf = async (markdown: string) =>
      decodeURIComponent(/src="data:image\/svg\+xml,([^"]+)"/.exec(await render(markdown))![1]!);
    const flat = await svgOf(':badge[passing]{label="build" preset="flat" color="success"}');
    expect(flat).toContain('height="20"');
    expect(flat).toContain('fill="#555555"');
    expect(flat).toContain('fill="#15803d"');
    expect(flat).toContain('rx="3"');
    const tall = await svgOf(':badge[passing]{label="build" preset="for-the-badge" icon="github"}');
    expect(tall).toContain('height="28"');
    expect(tall).toContain(">BUILD</text>");
    expect(tall).toContain('font-weight="bold"');
    expect(tall).toContain('aria-label="build: passing"');
    for (const preset of ["flat", "for-the-badge"]) {
      expect(await svgOf(`:badge[slow]{preset="${preset}" color="warning"}`)).toMatch(
        /fill="#dfb317".*fill="#000000"/,
      );
      expect(await svgOf(`:badge[down]{preset="${preset}" color="#4c1d95"}`)).toMatch(
        /fill="#4c1d95".*fill="#ffffff"/,
      );
      const auto = await svgOf(`:badge[ok]{preset="${preset}"}`);
      expect(auto).toMatch(
        /\.e\{stroke:none\}@media \(prefers-color-scheme:dark\)\{\.e\{stroke:#ffffff/,
      );
      for (const theme of ["light", "dark"])
        expect(await svgOf(`:badge[ok]{preset="${preset}" theme="${theme}"}`)).not.toContain(
          "prefers-color-scheme",
        );
      const unsafe = await svgOf(`:badge[<b>&"]{label="a'<" preset="${preset}" icon="npm"}`);
      expect(unsafe).not.toMatch(/<b>|<script|href=/);
      expect(unsafe).toContain("&lt;");
      for (const icon of ["npm", "npmx", "nuxt", "github", "comark", "shadcn", "package", "check"])
        expect(await svgOf(`:badge[ok]{preset="${preset}" icon="${icon}"}`)).toContain(
          'stroke="currentColor"',
        );
    }
  });
  it("exports canonical presets and matching logos without fetching", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    vi.stubGlobal("fetch", fetch);
    const hosted = createHtmlRenderer({ plugins: [badge({ download: false })], components });
    for (const preset of ["npmx", "nuxt", "flat", "for-the-badge"]) {
      const html = await hosted(
        `:badge{source="npm-version" package="comark-ui" preset="${preset}" style="solid" labelColor="#ff0000"}`,
      );
      expect(html).toContain(`preset=${preset}`);
      expect(html).toContain(`icon=${preset === "npmx" || preset === "nuxt" ? preset : "npm"}`);
      expect(html).not.toMatch(/style=|labelColor=/);
      const parsed = readBadge({ source: "npm-version", package: "comark-ui", preset });
      if (!parsed.ok) throw new Error(parsed.error);
      expect(readBadge(Object.fromEntries(badgeParams(parsed.value)))).toEqual(parsed);
      const explicit = await hosted(
        `:badge{source="npm-version" package="comark-ui" preset="${preset}" icon="none"}`,
      );
      expect(explicit).toContain("icon=none");
    }
    expect(fetch).not.toHaveBeenCalled();
  });
  it("reports an unknown preset with its correction", async () => {
    const document = await parseMarkdown(':badge[ready]{preset="missing"}', { plugins: [badge()] });
    expect(document.meta.issues).toEqual([
      expect.stringContaining("Use preset default, npmx, nuxt, flat, or for-the-badge."),
    ]);
    expect(Object.values(document.meta.issueRules)).toEqual(["comark/badge/invalid-image"]);
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
        async (url) =>
          new Response(
            JSON.stringify(
              (url instanceof Request ? url.url : url.toString()).includes("/actions/")
                ? { workflow_runs: [{ status: "completed", conclusion: "success" }] }
                : { default_branch: "main" },
            ),
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
    expect(fetch).toHaveBeenCalledTimes(2);
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
  it("draws a custom style from its radius, padding, border, font, and colors", async () => {
    const svgOf = async (markdown: string) =>
      decodeURIComponent(/src="data:image\/svg\+xml,([^"]+)"/.exec(await render(markdown))![1]!);
    const svg = await svgOf(
      ':badge[ready]{label="release" radius="0" padding="4" border="#a3a3a3" font="mono" labelColor="#fafafa" color="success" labelText="error"}',
    );
    expect(svg).toContain('<rect width="');
    expect(svg).toContain('rx="0"/></clipPath>');
    expect(svg).toContain('fill="none" stroke="#a3a3a3"/>');
    expect(svg).toContain('<path d="M0 0h58v26H0Z" fill="#fafafa"/>');
    expect(svg).toContain('fill="#15803d"/>');
    // The label's text takes its color; the value's, unset, turns white on the dark green.
    expect(svg).toContain(
      '<text x="4" y="17" fill="#b91c1c" font-family="DejaVu Sans Mono,monospace"',
    );
    expect(svg).toContain('fill="#ffffff" font-family="DejaVu Sans Mono,monospace"');
    const sans = await svgOf(':badge[ready]{style="custom" padding="" font=""}');
    expect(sans).toContain('rx="6"/></clipPath>');
    expect(sans).toContain('font-family="Arial,Helvetica,sans-serif"');
    expect(sans).not.toContain("stroke=");
  });
  it("accepts legacy badge specs without custom fields", async () => {
    const spec: BadgeSpec = {
      source: "static",
      label: "",
      value: "ready",
      color: "primary",
      labelColor: "neutral",
      icon: "none",
      theme: "auto",
      style: "shadcn",
      preset: "default",
      package: "",
      repository: "",
      workflow: "",
      branch: "",
      period: "month",
    };
    const query = badgeParams(spec).toString();
    const response = await createBadgeHandler()(
      new Request(`https://badges.example/badge.svg?${query}`),
    );
    expect(response.status).toBe(200);
    expect(query).toBe("value=ready&icon=none");
  });
  it("keeps the custom style in the image URL, so a link brings the same look back", async () => {
    const parsed = readBadge({
      source: "npm-version",
      package: "comark-ui",
      radius: 13,
      padding: "16",
      border: "neutral",
      font: "mono",
      valueText: "#fafafa",
    });
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.value.style).toBe("custom");
    const params = badgeParams(parsed.value);
    expect(params.toString()).toBe(
      "source=npm-version&label=npm&icon=npm&style=custom&package=comark-ui&radius=13&padding=16&border=neutral&font=mono&valueText=%23fafafa",
    );
    expect(readBadge(Object.fromEntries(params))).toEqual(parsed);
    // Another preset ignores the custom props, as it does `style`.
    const npmx = readBadge({ source: "npm-version", package: "x", preset: "npmx", radius: true });
    if (!npmx.ok) throw new Error(npmx.error);
    expect(badgeParams(npmx.value).has("radius")).toBe(false);
  });
  it("canonicalizes numeric fields before exporting a hosted image URL", async () => {
    const hosted = createHtmlRenderer({ plugins: [badge({ download: false })], components });
    const zeroes = "0".repeat(4096);
    const html = await hosted(
      `:badge{source="npm-version" package="comark-ui" radius="${zeroes}4" padding="${zeroes}12"}`,
    );
    const url = /src="([^"]+)"/.exec(html)?.[1]?.replaceAll("&amp;", "&");
    expect(url).toBeDefined();
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(Response.json({ latest: "1.2.3" }));
    const response = await createBadgeHandler({ fetch })(new Request(url!));
    expect(response.status).toBe(200);
    expect(new URL(url!).searchParams.get("radius")).toBe("4");
    expect(new URL(url!).searchParams.get("padding")).toBe("12");
  });
  it("reports a custom prop it can't draw, and one beside another style", async () => {
    const cases: [Record<string, unknown>, string, string][] = [
      [{ value: "x", radius: "14" }, "radius", "Use a radius from 0 to 13 pixels."],
      [{ value: "x", padding: "2.5" }, "padding", "Use a padding from 4 to 16 pixels."],
      [{ value: "x", font: "serif" }, "font", "Use font sans or mono."],
      [
        { value: "x", border: "red" },
        "border",
        "Use a semantic color or a six-digit hex color for border, or none.",
      ],
      [
        { value: "x", style: "solid", radius: "0" },
        "style",
        "Set style to custom to use radius, or remove radius.",
      ],
    ];
    for (const [input, field, error] of cases)
      expect(readBadge(input)).toEqual({ ok: false, field, error });
    const { meta } = await parseMarkdown(':badge[x]{radius="99"}', { plugins: [badge()] });
    expect(meta.issues).toEqual(['`:badge` 1 ("x"): Use a radius from 0 to 13 pixels.']);
  });
  it.each([
    [":badge[ready]{radius}", "Set radius to a whole number, or remove it."],
    [
      ':badge[ready]{style="custom" :padding="[4]"}',
      "Set padding to a whole number, or remove it.",
    ],
    [':badge[ready]{:font="false"}', "Set font to a text value, or remove it."],
  ])("reports wrongly typed custom fields in %s", async (markdown, fix) => {
    const { meta } = await parseMarkdown(markdown, { plugins: [badge()] });
    expect(meta.issueRules).toEqual({
      [`\`:badge\` 1 ("ready"): ${fix}`]: "comark/badge/invalid-image",
    });
  });
  it("draws the defaults for custom values it didn't read, so markup can't get in", () => {
    const svg = badgeSvg({
      label: "a",
      value: "b",
      color: "primary",
      labelColor: "neutral",
      icon: "none",
      theme: "auto",
      style: "custom",
      radius: '"/><script>',
      border: '"/><script>',
      labelText: '"/><script>',
    });
    expect(svg).not.toContain("<script");
    expect(svg).toContain('rx="6"/></clipPath>');
  });
});
