// Renders a comark Markdown report to HTML and screenshots it at reading width.
// Usage: node render.mjs report.md [outDir]
// Run it from a folder where comark, @comark/html, comark-ui and playwright are installed.
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [input, outDir = "render"] = process.argv.slice(2);
if (!input) throw new Error("Usage: node render.mjs report.md [outDir]");
const require = createRequire(join(process.cwd(), "noop.js"));
const load = (name) => import(pathToFileURL(require.resolve(name)).href);

const { createHtmlRenderer } = await load("@comark/html");
const { default: comarkUi } = await load("comark-ui/html");
const playwright = await load("playwright");
const { chromium } = playwright.chromium ? playwright : playwright.default;

mkdirSync(outDir, { recursive: true });
const name = basename(input).replace(/\.md$/, "");
const source = readFileSync(input, "utf8");
const rendered = await createHtmlRenderer(comarkUi())(source);
// A host such as Drop shows the frontmatter title above the page; the renderer doesn't.
const title = source.match(/^---\n[\s\S]*?^title:\s*"?(.*?)"?\s*$/m)?.[1] ?? "";
const escape = (text) =>
  text.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
const htmlPath = resolve(outDir, `${name}.html`);
writeFileSync(
  htmlPath,
  `<!doctype html><meta charset="utf-8"><style>body{max-width:760px;margin:2rem auto;padding:0 1rem;font-family:system-ui}</style>${title ? `<h1>${escape(title)}</h1>` : ""}${typeof rendered === "string" ? rendered : rendered.html}`,
);

// Playwright's own browser may be missing; fall back to the newest one in its cache.
const cache = join(homedir(), ".cache/ms-playwright");
const fallback = existsSync(cache)
  ? readdirSync(cache)
      .filter((d) => /^chromium-\d+$/.test(d))
      .sort((a, b) => Number(b.slice(9)) - Number(a.slice(9)))
      .map((d) => join(cache, d, "chrome-linux64/chrome"))
      .find((path) => existsSync(path))
  : undefined;
let browser;
try {
  browser = await chromium.launch();
} catch {
  browser = await chromium.launch({ executablePath: fallback });
}

const page = await browser.newPage({ viewport: { width: 900, height: 1600 } });
await page.goto(pathToFileURL(htmlPath).href);
await page.waitForTimeout(1000);
const shots = [];
for (const state of ["closed", "open"]) {
  if (state === "open")
    await page.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));
  // Folds animate open, so wait until the page stops growing before measuring it.
  let height = 0;
  for (let last = -1; height !== last; await page.waitForTimeout(400)) {
    last = height;
    height = await page.evaluate(() => document.documentElement.scrollHeight);
  }
  for (let y = 0, i = 0; y < height; y += 1600, i++) {
    const path = resolve(outDir, `${name}-${state}-${i}.png`);
    await page.screenshot({
      path,
      fullPage: true,
      clip: { x: 0, y, width: 900, height: Math.min(1600, height - y) },
    });
    shots.push(path);
  }
}
await browser.close();
console.log([htmlPath, ...shots].join("\n"));
