// Builds a data report's Markdown into one self-contained HTML page: a top bar with the title and a link per
// section, the report, and a sidebar with the page's outline and where the data comes from. Light and dark follow
// the reader's system, with a toggle. With --shots it also screenshots the page in both themes, in slices.
//
// Usage: node build.mjs report.md [report.html] [--shots outDir] [--force]
// Run it from a folder where comark, @comark/html, and comark-ui are installed, plus playwright for --shots.
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const flag = (name) => {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const [, value] = args.splice(index, 2);
  return value ?? "";
};
const shots = flag("--shots");
const force = args.includes("--force");
const [input, output = input?.replace(/\.md$/, ".html")] = args.filter((arg) => arg !== "--force");
if (!input)
  throw new Error("Usage: node build.mjs report.md [report.html] [--shots outDir] [--force]");

// Packages resolve from this folder, then from the report's.
const load = (name) => {
  for (const dir of new Set([process.cwd(), dirname(resolve(input))])) {
    try {
      return import(pathToFileURL(createRequire(join(dir, "noop.js")).resolve(name)).href);
    } catch {}
  }
  console.error(
    `Can't find ${name} from this folder or the report's. Install it here: pnpm add ${name}`,
  );
  process.exit(1);
};
const { parseMarkdown } = await load("comark");
const { renderHtmlFromDocument } = await load("@comark/html");
const { default: comarkUi } = await load("comark-ui/html");

const { plugins, components } = comarkUi();
const document = await parseMarkdown(readFileSync(input, "utf8"), { plugins });
const issues = document.meta.issues ?? [];
if (issues.length) {
  console.error(issues.map((issue) => `- ${issue}`).join("\n"));
  if (!force) {
    console.error(
      `\n${issues.length} issue(s) in ${input}. Fix them, or pass --force to build anyway.`,
    );
    process.exit(1);
  }
}

const escape = (text) =>
  String(text ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
const textOf = (node) =>
  typeof node === "string" ? node : Array.isArray(node) ? node.slice(2).map(textOf).join("") : "";
const outline = document.nodes
  .filter((node) => Array.isArray(node) && (node[0] === "h2" || node[0] === "h3") && node[1]?.id)
  .map((node) => ({ level: node[0], id: node[1].id, text: textOf(node).trim() }));
const front = document.frontmatter ?? {};
const title = front.title ?? basename(input, ".md");
// Every frontmatter field besides these describes the data, and the sidebar lists it as written.
const about = Object.entries(front).filter(
  ([key, value]) => !["title", "description"].includes(key) && typeof value !== "object",
);
const body = await renderHtmlFromDocument(document, { components });

const css = `
:root{color-scheme:light dark;--dr-side:17rem;--dr-top:3.5rem}
html.light,html:not(.dark){--comark-background:#ffffff;--comark-foreground:#0b0b0d;--comark-muted:#6b6b74;--comark-border:#e6e6ea;--comark-accent:#f3f3f5;--dr-hover:#f5f5f7}
html.dark{--comark-background:#0a0a0b;--comark-foreground:#ececef;--comark-muted:#8b8b94;--comark-border:#232327;--comark-accent:#18181b;--dr-hover:#141416}
@media (prefers-color-scheme:dark){html:not(.light){--comark-background:#0a0a0b;--comark-foreground:#ececef;--comark-muted:#8b8b94;--comark-border:#232327;--comark-accent:#18181b;--dr-hover:#141416}}
:root{--comark-font:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;--comark-radius:.625rem;--comark-grain:none}
*{box-sizing:border-box}
body{margin:0;background:var(--comark-background);color:var(--comark-foreground);font:14px/1.6 var(--comark-font);font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased}
a{color:inherit}
.dr-top{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:1.5rem;height:var(--dr-top);padding:0 1.5rem;border-bottom:1px solid var(--comark-border);background:var(--comark-background)}
.dr-brand{display:flex;flex-direction:column;min-width:0;line-height:1.25}
.dr-brand b{font-weight:600;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dr-brand span{color:var(--comark-muted);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dr-nav{display:flex;flex:1;gap:1.25rem;align-self:stretch;min-width:0;padding-left:1.5rem;border-left:1px solid var(--comark-border);overflow-x:auto;scrollbar-width:none}
.dr-nav a{display:flex;align-items:center;border-bottom:1px solid transparent;color:var(--comark-muted);font-size:13px;text-decoration:none;white-space:nowrap}
.dr-nav a:hover,.dr-nav a[aria-current]{color:var(--comark-foreground)}
.dr-nav a[aria-current]{border-bottom-color:var(--comark-foreground)}
.dr-theme{flex:none;height:2rem;padding:0 .75rem;border:1px solid var(--comark-border);border-radius:.5rem;background:none;color:var(--comark-muted);font:inherit;font-size:12.5px;cursor:pointer}
.dr-theme:hover{color:var(--comark-foreground);background:var(--dr-hover)}
.dr-layout{display:grid;grid-template-columns:minmax(0,1fr) var(--dr-side);min-height:calc(100vh - var(--dr-top))}
.dr-main{min-width:0;padding:1.75rem 2rem 4rem}
.dr-main>.dr-body{max-width:52rem}
.dr-body :is(h2,h3)[id]{scroll-margin-top:calc(var(--dr-top) + 1rem)}
.dr-side{position:sticky;top:var(--dr-top);height:calc(100vh - var(--dr-top));overflow-y:auto;padding:1.75rem 1.25rem;border-left:1px solid var(--comark-border);font-size:13px}
.dr-side h2{margin:0 0 .5rem;color:var(--comark-foreground);font-size:13px;font-weight:600}
.dr-side ol{margin:0 0 1.75rem;padding:0;list-style:none}
.dr-side li a{display:block;padding:.2rem 0 .2rem .75rem;border-left:1px solid var(--comark-border);color:var(--comark-muted);text-decoration:none}
.dr-side li.dr-h3 a{padding-left:1.5rem;font-size:12.5px}
.dr-side li a:hover{color:var(--comark-foreground)}
.dr-side li a[aria-current]{border-left-color:var(--comark-foreground);color:var(--comark-foreground)}
.dr-side dl{display:grid;gap:.6rem;margin:0}
.dr-side dt{color:var(--comark-muted);font-size:12px}
.dr-side dd{margin:0;overflow-wrap:anywhere}
.dr-foot{max-width:52rem;margin-top:3rem;padding-top:1rem;border-top:1px solid var(--comark-border);color:var(--comark-muted);font-size:12px}
@media (max-width:1100px){.dr-layout{grid-template-columns:1fr}.dr-side{position:static;height:auto;border-left:0;border-top:1px solid var(--comark-border)}.dr-brand span{display:none}}
@media (max-width:640px){.dr-nav{display:none}.dr-main{padding:1.25rem 1rem 3rem}}
@media print{.dr-top,.dr-side{display:none}.dr-layout{display:block}}
`;

// Picks a theme the reader chose before, follows the system otherwise, and marks the section in view in the top
// bar and the outline.
const script = `(() => {
  const root = document.documentElement;
  const saved = localStorage.getItem("dr-theme");
  if (saved) root.classList.add(saved);
  document.querySelector(".dr-theme").addEventListener("click", () => {
    const dark = root.classList.contains("dark") || (!root.classList.contains("light") && matchMedia("(prefers-color-scheme: dark)").matches);
    root.classList.remove("dark", "light");
    root.classList.add(dark ? "light" : "dark");
    localStorage.setItem("dr-theme", dark ? "light" : "dark");
  });
  const links = [...document.querySelectorAll(".dr-nav a, .dr-side ol a")];
  const headings = [...document.querySelectorAll(".dr-side ol a")]
    .map((link) => document.getElementById(link.getAttribute("href").slice(1)))
    .filter(Boolean);
  const mark = () => {
    let current = headings[0];
    for (const heading of headings) if (heading.getBoundingClientRect().top < 120) current = heading;
    const section = current && (current.tagName === "H2" ? current : headings.slice(0, headings.indexOf(current)).reverse().find((h) => h.tagName === "H2"));
    for (const link of links) {
      const id = link.getAttribute("href").slice(1);
      const on = link.closest(".dr-nav") ? id === section?.id : id === current?.id;
      link.toggleAttribute("aria-current", on);
    }
  };
  addEventListener("scroll", mark, { passive: true });
  mark();
})();`;

const nav = outline.filter((item) => item.level === "h2");
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title>
${front.description ? `<meta name="description" content="${escape(front.description)}">` : ""}
<style>${css}</style>
</head>
<body>
<header class="dr-top">
  <div class="dr-brand"><b>${escape(title)}</b>${front.description ? `<span>${escape(front.description)}</span>` : ""}</div>
  <nav class="dr-nav" aria-label="Sections">${nav.map((item) => `<a href="#${escape(item.id)}">${escape(item.text)}</a>`).join("")}</nav>
  <button type="button" class="dr-theme">Light / dark</button>
</header>
<div class="dr-layout">
  <main class="dr-main">
    <div class="dr-body">${body}</div>
    ${front.source ? `<footer class="dr-foot">Data: ${escape(front.source)}${front.updated ? `, as of ${escape(front.updated)}` : ""}.</footer>` : ""}
  </main>
  <aside class="dr-side">
    ${outline.length ? `<h2>On this page</h2><ol>${outline.map((item) => `<li class="dr-${item.level}"><a href="#${escape(item.id)}">${escape(item.text)}</a></li>`).join("")}</ol>` : ""}
    ${about.length ? `<h2>About the data</h2><dl>${about.map(([key, value]) => `<div><dt>${escape(key[0].toUpperCase() + key.slice(1))}</dt><dd>${escape(value)}</dd></div>`).join("")}</dl>` : ""}
  </aside>
</div>
<script>${script}</script>
</body>
</html>
`;
writeFileSync(output, html);
console.log(resolve(output));

if (shots !== undefined) {
  const outDir = shots || "shots";
  mkdirSync(outDir, { recursive: true });
  const playwright = await load("playwright");
  const { chromium } = playwright.chromium ? playwright : playwright.default;
  // Playwright's own browser may be missing; fall back to the newest one in its cache.
  const cache = join(homedir(), ".cache/ms-playwright");
  const fallback = existsSync(cache)
    ? readdirSync(cache)
        .filter((dir) => /^chromium-\d+$/.test(dir))
        .sort((a, b) => Number(b.slice(9)) - Number(a.slice(9)))
        .map((dir) => join(cache, dir, "chrome-linux64/chrome"))
        .find((path) => existsSync(path))
    : undefined;
  const browser = await chromium
    .launch()
    .catch(() => chromium.launch({ executablePath: fallback }));
  const name = basename(output, ".html");
  for (const theme of ["light", "dark"]) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      colorScheme: theme,
    });
    await page.goto(pathToFileURL(resolve(output)).href);
    await page.waitForTimeout(800);
    // A whole report is several thousand pixels tall, and an image that tall is read shrunk past its labels, so the
    // page is saved in slices of about two screens.
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0, part = 1; y < height; y += 1400, part++) {
      const path = resolve(outDir, `${name}-${theme}-${part}.png`);
      await page.screenshot({
        path,
        fullPage: true,
        clip: { x: 0, y, width: 1440, height: Math.min(1400, height - y) },
      });
      console.log(path);
    }
  }
  await browser.close();
}
