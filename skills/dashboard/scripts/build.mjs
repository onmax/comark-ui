// node build.mjs report.json report.html [--shots dir]
// Checks report.json, then writes one self-contained HTML page. With --shots, it opens the page and saves a
// screenshot of every view in light and dark, plus the first view on a phone, and fails on any chart that broke.
// Run it from a folder where comark-ui and playwright are installed: Vega comes from comark-ui's install.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { check } from "./check.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const assets = join(here, "../assets");
const [input, output, ...rest] = process.argv.slice(2);
if (!input || !output) {
  console.error("Usage: node build.mjs report.json report.html [--shots dir]");
  process.exit(2);
}
const shots = rest[0] === "--shots" ? resolve(rest[1] ?? "shots") : null;

let report;
try {
  report = JSON.parse(readFileSync(input, "utf8"));
} catch (error) {
  console.error(`${input} isn't valid JSON: ${error.message}`);
  process.exit(1);
}
const result = check(report);
for (const w of result.warnings) console.log(`warning  ${w}`);
for (const e of result.errors) console.log(`error    ${e}`);
if (result.errors.length) {
  console.log(`\n${result.errors.length} errors. Fix them and build again.`);
  process.exit(1);
}

// pnpm keeps vega inside comark-charts, so look in the current folder first, then follow comark-ui to it.
const local = createRequire(join(process.cwd(), "noop.js"));
function packageDir(name) {
  const tries = [local];
  try {
    const ui = createRequire(local.resolve("comark-ui/package.json"));
    tries.push(createRequire(ui.resolve("comark-charts/package.json")));
  } catch {}
  for (const require of tries) {
    try {
      for (let dir = dirname(require.resolve(name)); dir !== dirname(dir); dir = dirname(dir)) {
        const manifest = join(dir, "package.json");
        if (existsSync(manifest) && JSON.parse(readFileSync(manifest, "utf8")).name === name)
          return dir;
      }
    } catch {}
  }
  console.error(
    `Can't find ${name}. Run the build from a folder where comark-ui is installed (pnpm add comark-ui playwright).`,
  );
  process.exit(1);
}
const vega = readFileSync(join(packageDir("vega"), "build/vega.min.js"), "utf8");
const vegaLite = readFileSync(join(packageDir("vega-lite"), "build/vega-lite.min.js"), "utf8");
const app = readFileSync(join(assets, "app.js"), "utf8");
const css = readFileSync(join(assets, "style.css"), "utf8");
const script = (code) => `<script>${code.replace(/<\/script/gi, "<\\/script")}</script>`;
const json = JSON.stringify(report).replace(/</g, "\\u003c");
const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(report.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap">
${report.intro ? `<meta name="description" content="${esc(report.intro)}">` : ""}
<style>${css}</style>
</head>
<body>
<div id="report"></div>
<script id="report-data" type="application/json">${json}</script>
${script(vega)}
${script(vegaLite)}
${script(`(() => {\n${app}\n})();`)}
</body>
</html>
`;
mkdirSync(dirname(resolve(output)), { recursive: true });
writeFileSync(output, html);
console.log(
  `Wrote ${output} (${(html.length / 1024).toFixed(0)} kB, ${result.rows} rows, ${report.views.length} views${result.escapes ? `, ${result.escapes} raw Vega-Lite blocks` : ""}).`,
);

if (shots) {
  mkdirSync(shots, { recursive: true });
  const playwright = await import(pathToFileURL(local.resolve("playwright")).href);
  const { chromium } = playwright.chromium ? playwright : playwright.default;
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
  const problems = [];
  const url = pathToFileURL(resolve(output)).href;
  for (const theme of ["light", "dark"]) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    page.on("pageerror", (e) => problems.push(`page error: ${e.message}`));
    page.on(
      "console",
      (m) =>
        m.type() === "error" &&
        !/Failed to load resource/.test(m.text()) &&
        problems.push(`console: ${m.text()}`),
    );
    await page.goto(`${url}?theme=${theme}`);
    await page.evaluate(() => document.fonts.ready);
    const ids = await page.evaluate(() => window.__report?.views ?? []);
    for (const id of ids) {
      await page.evaluate((v) => window.__report.go(v), id);
      await page
        .waitForFunction((v) => document.body.dataset.ready === v, id, { timeout: 20000 })
        .catch(() => problems.push(`view ${id}: charts didn't finish drawing in 20 s`));
      await page.waitForTimeout(150);
      if (theme === "light") {
        const broken = await page.$$eval(".rp-chart[data-state=error]", (els) =>
          els.map((el) => `${el.getAttribute("aria-label")}: ${el.dataset.error}`),
        );
        for (const b of broken) problems.push(`view ${id}: chart "${b}"`);
        const clipped = await page.$$eval(".rp-block", (cards) =>
          cards
            .filter((c) => c.scrollWidth > c.clientWidth + 2 && !c.querySelector(".rp-scroll"))
            .map((c) => c.querySelector("h3")?.textContent ?? "a block"),
        );
        for (const c of clipped) problems.push(`view ${id}: "${c}" is wider than its card`);
      }
      await page.screenshot({ path: join(shots, `${id}-${theme}.png`), fullPage: true });
    }
    await page.close();
  }
  const phone = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  await phone.goto(`${url}?theme=light`);
  await phone
    .waitForFunction(() => document.body.dataset.ready, null, { timeout: 20000 })
    .catch(() => {});
  await phone.screenshot({ path: join(shots, "phone.png"), fullPage: true });
  await browser.close();
  for (const p of new Set(problems)) console.log(`error    ${p}`);
  console.log(
    `Screenshots in ${shots}: one per view and theme, plus phone.png. Open every one before you call the report done.`,
  );
  if (problems.length) process.exit(1);
}
