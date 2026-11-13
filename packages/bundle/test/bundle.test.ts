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

// Builds from files in memory, by their path under the root.
const memory = (files: Record<string, string>): BundleOptions => ({
  read: (path) => files[path],
  list: (path) => {
    const names = Object.keys(files)
      .filter((name) => name.startsWith(`${path}/`))
      .map((name) => name.slice(path.length + 1));
    return names.length ? names : undefined;
  },
});
const one = (files: Record<string, string>) =>
  render(
    block('src="build"'),
    memory(
      Object.fromEntries(Object.entries(files).map(([name, code]) => [`build/${name}`, code])),
    ),
  );
// A sourcemap that gives the whole one-line chunk to one source.
const mapOf = (source: string) =>
  JSON.stringify({ version: 3, sources: [source], names: [], mappings: "AAAA" });

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

  it("leaves a chunk that lazy pages share out of every page, though it imports the entry", async () => {
    const html = await one({
      "entry.js": 'const a=()=>import("./page.js"),b=()=>import("./page2.js");',
      "page.js": 'import"./entry.js";import"./shared.js";',
      "page2.js": 'import"./entry.js";import"./shared.js";',
      "shared.js": 'import"./entry.js";',
    });
    expect(html).toMatch(/class="cbr-top" title="[^"]*, 1 chunk"/);
  });

  it.each([
    ["imports the entry back", 'import"./entry.js";', 'import"./entry.js";'],
    ["imports nothing back", "", ""],
    ["needs code that imports the entry back", "", 'import"./entry.js";'],
  ])(
    "leaves what a lazy chunk's own lazy chunk needs out of every page, when it %s",
    async (_, back, shared) => {
      const html = await one({
        "entry.js": 'const a=()=>import("./route.js");',
        "route.js": `${back}const b=()=>import("./modal.js");`,
        "modal.js": `${back}import{s}from"./shared.js";`,
        "shared.js": `${shared}export const s=1;`,
      });
      expect(html).toMatch(/class="cbr-top" title="[^"]*, 1 chunk"/);
    },
  );

  // What Vite writes: the default base, a relative base, and a `?worker` import.
  it.each([
    "new Worker(new URL(`/assets/worker.js`, `` + import.meta.url), { type: `module` });",
    "new Worker(new URL(new URL(`worker.js`, import.meta.url).href, `` + import.meta.url));",
    "new Worker(`/assets/worker.js`, { name: options?.name });",
    'new Worker(new URL("./worker.js",import.meta.url));',
  ])("counts a worker as lazy: %s", async (code) => {
    const html = await one({
      "assets/entry.js": code,
      "assets/worker.js": "self.onmessage=()=>{};",
    });
    expect(html).toMatch(/class="cbr-top" title="[^"]*, 1 chunk"/);
  });

  it("finds Nuxt's default layout when nothing wraps its import", async () => {
    const text = words(
      await one({
        "entry.js": 'const layouts={default:Jt(()=>import("./default.js"))};mount("#__nuxt");',
        "default.js": "export default{};",
      }),
    );
    expect(text).toContain("every page counts the default layout");
  });

  it("leaves a lazy layout out of every page in an app that isn't Nuxt", async () => {
    const text = words(
      await one({
        "entry.js": 'const Layout=()=>import("./default.js");',
        "entry.js.map": mapOf("../src/main.ts"),
        "default.js": "export default{};",
        "default.js.map": mapOf("../src/layouts/default.vue"),
      }),
    );
    expect(text).not.toContain("every page counts the default layout");
  });

  it.each([
    ["", ""],
    ["while another unmapped script shrinks", "self.v=1;"],
  ])("doesn't call a package removed when its chunk lost its sourcemap %s", async (_, smaller) => {
    const charts = `export const chart=${JSON.stringify("chart ".repeat(400))};`;
    const files: Record<string, string> = {};
    for (const side of ["main", "pr"]) {
      files[`${side}/entry.js`] = 'import"./charts.js";';
      files[`${side}/entry.js.map`] = mapOf("../src/main.ts");
      files[`${side}/charts.js`] = charts;
    }
    files["main/charts.js.map"] = mapOf("../node_modules/charts/index.js");
    if (smaller) {
      files["main/sw.js"] =
        `self.v=[${Array.from({ length: 500 }, (_, i) => (i * 7919) % 10007).join(",")}];`;
      files["pr/sw.js"] = smaller;
    }
    const html = await render(block('before="main" after="pr"'), memory(files));
    expect(words(html)).not.toContain("charts removed");
    expect(html).not.toContain('data-kind="removed"');
  });

  it.each([
    ["main", "pr"],
    ["pr", "main"],
  ])(
    "doesn't call a package added or removed when its chunk lost its map and shrank (%s to %s)",
    async (before, after) => {
      const charts = `export const chart=[${Array.from({ length: 300 }, (_, i) => (i * 7919) % 10007).join(",")}];`;
      const files: Record<string, string> = {};
      for (const side of ["main", "pr"]) {
        files[`${side}/entry.js`] = `import"./${side === "main" ? "charts-a" : "charts-b"}.js";`;
        files[`${side}/entry.js.map`] = mapOf("../src/main.ts");
      }
      files["main/charts-a.js"] = `${charts}\n//# sourceMappingURL=charts-a.js.map`;
      files["main/charts-a.js.map"] = mapOf("../node_modules/charts/index.js");
      files["pr/charts-b.js"] = charts.slice(0, -40);
      const html = await render(block(`before="${before}" after="${after}"`), memory(files));
      expect(words(html)).not.toMatch(/charts (removed|added)/);
    },
  );

  it("still names a package added when both builds ship the same script without a sourcemap", async () => {
    const worker = `self.v=${JSON.stringify("service worker ".repeat(300))};`;
    const files: Record<string, string> = {};
    for (const side of ["main", "pr"]) {
      files[`${side}/index.html`] = '<script type="module" src="/assets/entry.js"></script>';
      files[`${side}/sw.js`] = worker;
    }
    files["main/assets/entry.js"] = "export{};";
    files["main/assets/entry.js.map"] = mapOf("../src/main.ts");
    files["pr/assets/entry.js"] = 'import"./zod.js";';
    files["pr/assets/entry.js.map"] = mapOf("../src/main.ts");
    files["pr/assets/zod.js"] = `export const z=${JSON.stringify("zod ".repeat(200))};`;
    files["pr/assets/zod.js.map"] = mapOf("../node_modules/zod/index.js");
    expect(words(await render(block('before="main" after="pr"'), memory(files)))).toContain(
      "zod added",
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
    expect(html).toMatch(/<div class="cbr-foot-2">\s*5 packages · 5 chunks\s*<\/div>/);
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
