import { createHtmlRenderer } from "@comark/html";
import { parseMarkdown } from "comark";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vite-plus/test";
import bundle, { components, type BundleOptions } from "../src/html.ts";

const root = new URL("fixtures/", import.meta.url).pathname;
const render = (markdown: string, options: BundleOptions = { root }) =>
  createHtmlRenderer({ plugins: [bundle(options)], components })(markdown);
const parse = (markdown: string, options: BundleOptions = { root }) =>
  parseMarkdown(markdown, { plugins: [bundle(options)] });
// The text a reader sees, tags and the styles left out.
const words = (html: string) =>
  html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const block = (props: string) => `::bundle{${props}}\n::`;

describe("comark-bundle", () => {
  it("compares two Sonda reports: the number, the bars, the sentence, and the treemap behind a disclosure", async () => {
    const html = await render(
      block('before="sonda/main.json" after="sonda/pr.json" title="ECharts 5.5"') +
        "\n\n" +
        block('before="sonda/main.json" after="sonda/pr.json"'),
    );
    expect(html).toContain(
      '<figure class="cbr" data-comark-frame data-not-typeset aria-label="ECharts 5.5">',
    );
    expect(html).toContain('aria-label="Bundle size"');
    const text = words(html);
    expect(text).toContain("379.1 kB +127.8 kB every page, was 251.3 kB before");
    expect(text).toContain(
      "Every page up 127.8 kB (50.9%): lodash removed; echarts, zrender moved into every page; lodash-es added",
    );
    expect(text).toContain("Lazy 270.5 kB (−142.3 kB) · Sonda 0.14.0");
    expect(text).toContain("What's in the bundle 7 packages · 5 chunks");
    expect(html).toMatch(
      /class="cbr-seg" data-kind="removed" style="width:[\d.]+%" title="lodash: 24.6 kB"/,
    );
    expect(html).toMatch(
      /class="cbr-seg" data-kind="moved-in" style="width:[\d.]+%" title="echarts: 102.7 kB">/,
    );
    expect(html).toMatch(/<details class="cbr-more">\s*<summary>/);
    // A removed package keeps its old area in the treemap.
    expect(html).toMatch(
      /class="cbr-tile" data-kind="removed"[^>]*title="lodash: 24.6 kB, removed"/,
    );
    expect(html.match(/<style data-comark-bundle>/g)).toHaveLength(1);
  });

  it("measures a build folder, finds the entry in index.html, and names packages from sourcemaps", async () => {
    const html = await render(block('before="vite/before/assets" after="vite/after/assets"'));
    const text = words(html);
    expect(text).toContain(
      "Every page up 4.1 kB (75.6%): lodash removed; echarts, zrender moved into every page; lodash-es added",
    );
    expect(text).toContain("· gzip -9 · brotli 11");
    expect(text).toContain("5 packages · 4 chunks");
  });

  it("counts Nuxt's default layout toward every page, and shows chunks when the build has no sourcemaps", async () => {
    const value = await parse(block('before="nuxt/before" after="nuxt/after"'));
    expect(value.meta.issues).toEqual([]);
    const text = words(await render(block('before="nuxt/before" after="nuxt/after"')));
    // The layout imports Moment's chunk on main, so every page shrinks when it goes.
    expect(text).toContain("every page, was 8.3 kB before");
    expect(text).toContain("Every page down 3.5 kB (41.6%)");
    expect(text).toContain("every page counts the default layout");
    expect(text).toContain("No sourcemaps, so chunks instead of packages.");
    expect(text).toContain("entry-A1b2.js");
  });

  it("shows one build with its number and what it holds, and no disclosure", async () => {
    const html = await render(block('src="sonda/pr.json"'));
    expect(words(html)).toContain("379.1 kB every page · lazy 270.5 kB");
    expect(html).toContain('class="cbr-tile"');
    expect(html).not.toContain("<details");
  });

  it("puts raw and brotli sizes in the number's tooltip", async () => {
    const html = await render(block('before="sonda/main.json" after="sonda/pr.json"'));
    expect(html).toMatch(
      /class="cbr-top" title="raw [\d.]+ kB → [\d.]+ MB, brotli [\d.]+ kB → [\d.]+ kB, 1 → 2 chunks"/,
    );
  });

  it("reads Sonda reports through `read` where there's no disk", async () => {
    const files: Record<string, string> = {
      "main.json": await readFile(`${root}sonda/main.json`, "utf8"),
      "pr.json": await readFile(`${root}sonda/pr.json`, "utf8"),
    };
    const options = { read: (path: string) => files[path], list: () => undefined };
    expect(words(await render(block('before="main.json" after="pr.json"'), options))).toContain(
      "379.1 kB +127.8 kB",
    );
    const value = await parse(block('before="dist" after="pr.json"'), options);
    expect(value.meta.issues).toEqual([
      '`::bundle` 1: "dist" doesn\'t exist. It resolved to "dist" under the root; check the path or `base`.',
    ]);
  });

  it.each([
    ["missing-build", block('title="Sizes"'), "it has no build to read."],
    ["missing-side", block('after="sonda/pr.json"'), "it has `after` but no `before`."],
    [
      "mixed-props",
      block('src="sonda/pr.json" before="sonda/main.json"'),
      "it has `src` and `before` or `after`.",
    ],
    [
      "unknown-prop",
      block('src="sonda/pr.json" gzip="9"'),
      "`gzip` isn't a prop of `::bundle`, so it's ignored.",
    ],
    [
      "content-dropped",
      '::bundle{src="sonda/pr.json"}\nECharts now loads on every page.\n::',
      "it drops what's inside it",
    ],
    ["remote-src", block('src="https://example.com/pr.json"'), "is a URL."],
    ["outside-root", block('src="../../main.json"'), "leaves the root."],
    ["not-found", block('src="sonda/branch.json"'), "doesn't exist."],
    ["unreadable", block('src="sonda"'), "it has no JavaScript files."],
  ])("reports %s, naming the block and the fix", async (kind, markdown, message) => {
    const value = await parse(markdown);
    expect(value.meta.issues).toHaveLength(1);
    const [issue] = value.meta.issues;
    expect(issue).toContain("`::bundle` 1");
    expect(issue).toContain(message);
    expect(value.meta.issueRules[issue!]).toBe(`comark/bundle/${kind}`);
  });

  it("reports a JSON file that isn't a Sonda report", async () => {
    const value = await parse(block('src="not-sonda.json"'), {
      read: () => '{ "version": 3 }',
      list: () => undefined,
    });
    expect(value.meta.issues).toEqual([
      "`::bundle` 1: \"not-sonda.json\" can't be read: it isn't a Sonda report: it has no `metadata.version` or `resources`.",
    ]);
  });
});
