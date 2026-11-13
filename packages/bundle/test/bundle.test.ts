import { createHtmlRenderer } from "@comark/html";
import { parseMarkdown } from "comark";
import { readdir, readFile } from "node:fs/promises";
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
const compare = block('before="vite/main/assets" after="vite/pr/assets"');
// The fixtures without the index.html Vite writes next to the assets, as when only the assets folder was kept.
const assetsOnly: BundleOptions = {
  read: async (path) =>
    path.endsWith("index.html") ? undefined : readFile(root + path, "utf8").catch(() => undefined),
  list: (path) => readdir(root + path, { recursive: true }).catch(() => undefined),
};

describe("comark-bundle", () => {
  it("compares two builds: the number, the bars, and the treemap behind a disclosure, with the styles once", async () => {
    const html = await render(`${compare}\n\n${compare}`);
    expect(html).toContain(
      '<figure class="cbr" data-comark-frame data-not-typeset aria-label="Bundle size">',
    );
    const text = words(html);
    expect(text).toContain("9.7 kB +4.3 kB every page, was 5.4 kB before");
    // Said in words for screen readers, since the badge and the names under the bars say it on screen.
    expect(text).toContain(
      "Every page up 4.3 kB (79.0%): lodash removed; echarts, zrender moved into every page; lodash-es added",
    );
    expect(html).toMatch(
      /class="cbr-seg" data-kind="removed" style="width:[\d.]+%" title="lodash: /,
    );
    expect(html).toMatch(
      /class="cbr-seg" data-kind="moved-in" style="width:[\d.]+%" title="echarts: /,
    );
    expect(html).toMatch(/<details class="cbr-more">\s*<summary>/);
    expect(text).toContain("What's in the bundle 5 packages · 5 chunks");
    // A removed package keeps its old area in the treemap.
    expect(html).toMatch(
      /class="cbr-tile" data-kind="removed"[^>]*title="lodash: [\d.]+ kB, removed"/,
    );
    expect(html.match(/<style data-comark-bundle>/g)).toHaveLength(1);
  });

  it("keeps package names when one chunk has no sourcemap, and says which", async () => {
    const text = words(await render(compare));
    expect(text).toContain(
      "Lazy 0.8 kB (−4.8 kB) · gzip -9 · brotli 11 · 1 chunk without a sourcemap",
    );
  });

  it("finds the entry without index.html, though a lazy chunk imports back from it", async () => {
    expect(words(await render(compare, assetsOnly))).toContain(
      "9.7 kB +4.3 kB every page, was 5.4 kB before",
    );
  });

  it("counts Nuxt's default layout toward every page, and shows chunks when the build has no sourcemaps", async () => {
    const markdown = block('before="nuxt/before" after="nuxt/after"');
    expect((await parse(markdown)).meta.issues).toEqual([]);
    const text = words(await render(markdown));
    // The layout imports Moment's chunk on main, so every page shrinks when it goes.
    expect(text).toContain("every page, was 8.3 kB before");
    expect(text).toContain("Every page down 3.5 kB (41.6%)");
    expect(text).toContain("every page counts the default layout");
    expect(text).toContain("No sourcemaps, so chunks instead of packages.");
    expect(text).toContain("entry-A1b2.js");
  });

  it("shows one build with its number and what it holds, and no disclosure", async () => {
    const html = await render(block('src="vite/pr/assets"'));
    expect(words(html)).toContain("9.7 kB every page · lazy 0.8 kB");
    expect(html).toContain('class="cbr-tile"');
    expect(html).not.toContain("<details");
  });

  it("puts raw and brotli sizes in the number's tooltip", async () => {
    expect(await render(compare)).toMatch(
      /class="cbr-top" title="raw [\d.]+ kB → [\d.]+ kB, brotli [\d.]+ kB → [\d.]+ kB, 2 → 4 chunks"/,
    );
  });

  it.each([
    ["missing-build", block('title="Sizes"'), "it has no build to read."],
    ["missing-side", block('after="vite/pr/assets"'), "it has `after` but no `before`."],
    [
      "mixed-props",
      block('src="vite/pr/assets" before="vite/main/assets"'),
      "it has `src` and `before` or `after`.",
    ],
    [
      "unknown-prop",
      block('src="vite/pr/assets" gzip="9"'),
      "`gzip` isn't a prop of `::bundle`, so it's ignored.",
    ],
    [
      "content-dropped",
      '::bundle{src="vite/pr/assets"}\nECharts now loads on every page.\n::',
      "it drops what's inside it",
    ],
    ["remote-src", block('src="https://example.com/dist"'), "is a URL."],
    ["outside-root", block('src="../../dist"'), "leaves the root."],
    ["not-found", block('src="vite/branch/assets"'), "doesn't exist."],
    ["unreadable", block('src="vite/pr/index.html"'), "it's a file."],
  ])("reports %s, naming the block and the fix", async (kind, markdown, message) => {
    const value = await parse(markdown);
    expect(value.meta.issues).toHaveLength(1);
    const [issue] = value.meta.issues;
    expect(issue).toContain("`::bundle` 1");
    expect(issue).toContain(message);
    expect(value.meta.issueRules[issue!]).toBe(`comark/bundle/${kind}`);
  });

  it.each([
    ["a folder with no JavaScript", { "README.md": "# Build" }, "it has no JavaScript files."],
    [
      "chunks that only load each other lazily",
      { "a.js": 'const b=()=>import("./b.js")', "b.js": 'const a=()=>import("./a.js")' },
      "it doesn't show which chunk is the entry.",
    ],
  ])("reports %s as unreadable", async (_name, files: Record<string, string>, message) => {
    const value = await parse(block('src="dist"'), {
      read: (path) => files[path.replace(/^dist\//, "")],
      list: (path) => (path === "dist" ? Object.keys(files) : undefined),
    });
    expect(value.meta.issues).toHaveLength(1);
    expect(value.meta.issues[0]).toContain(message);
    expect(value.meta.issueRules[value.meta.issues[0]!]).toBe("comark/bundle/unreadable");
  });
});
