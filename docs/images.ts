// Draws the docs' images in headless Chromium: the screens of Spurious, the made-up app the annotate examples mark up;
// the annotated screenshot at the top of annotate's README; the site's Open Graph image; and the README banner. Run it
// after changing any of them with `pnpm docs:images`. It prints the box of each marked element in the app, as
// annotation props, so the examples can point at it.
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { renderHtmlFromDocument } from "@comark/html";
import { chromium, type Browser } from "@playwright/test";
import { parseMarkdown } from "comark";
import annotate, { components as annotateComponents } from "../packages/annotate/src/html.ts";
import { callouts, components as githubComponents } from "../packages/github/src/html.ts";
import { draw } from "../packages/annotate/src/marks.ts";

const root = new URL("./", import.meta.url);
const pub = new URL("public/", root);
const fonts = new URL("../node_modules/geist/dist/fonts/", root);
const red = "#e5484d";
// The banner counts the packages instead of naming one.
const plugins = (
  await Promise.all(
    (await readdir(new URL("../packages/", root))).map((dir) =>
      readFile(new URL(`../packages/${dir}/package.json`, root)).then(
        () => true,
        () => false,
      ),
    ),
  )
).filter(Boolean).length;

// The pages are set as content, with no origin to load files from, so fonts and images go in as data URLs.
const font = async (family: string, file: string) =>
  `@font-face{font-family:"${family}";src:url("data:font/woff2;base64,${(await readFile(new URL(file, fonts))).toString("base64")}") format("woff2");font-weight:100 900}`;
const fontFaces =
  (await font("Geist", "geist-sans/Geist-Variable.woff2")) +
  (await font("Geist Mono", "geist-mono/GeistMono-Variable.woff2"));
const html = (style: string, body: string) =>
  `<!doctype html><html><head><meta charset="utf-8"><style>${fontFaces}*{box-sizing:border-box}html,body{margin:0}${style}</style></head><body>${body}</body></html>`;
const dataUrl = (png: Buffer) => `data:image/png;base64,${png.toString("base64")}`;

type Screen = "before" | "after" | "dashboard";
const sizes = { before: [640, 250], after: [640, 250], dashboard: [720, 430] } as const;

const toolbar = (screen: Screen) => {
  const chips =
    screen === "before"
      ? ["Office: Lisbon", "Weather: Drizzle", "Moon: Waxing", "Vibes: Good"]
      : ["Office: Lisbon", "Weather: Drizzle"];
  return (
    `<div class="toolbar${screen === "before" ? " wraps" : ""}" data-box="toolbar"><input placeholder="Search pairs..." data-box="search">` +
    chips.map((chip) => `<button>${chip}</button>`).join("") +
    (screen === "before" ? "" : `<button class="more" data-box="more">+2 filters</button>`) +
    `<button class="apply" data-box="apply">Apply</button></div>`
  );
};

const rows = [
  ["Pizzas vs. merged PRs", "0.91", "0.93", "0.95"],
  ["Pigeons vs. failed deploys", "0.88", "", "0.90"],
  ["Standup minutes vs. live plants", "-0.72", "-0.75", "-0.81"],
];
const table = (count: number) =>
  `<table><thead><tr><th>Pair</th><th>Week 14</th><th>Week 15</th><th>Week 16</th></tr></thead><tbody>` +
  rows
    .slice(0, count)
    .map(
      (row) =>
        `<tr>${row.map((cell) => (cell ? `<td>${cell.replace("-", "−")}</td>` : `<td class="none" data-box="missing">—</td>`)).join("")}</tr>`,
    )
    .join("") +
  `</tbody></table>`;

const card = (label: string, value: string, change: string, trend: "up" | "down", box: string) =>
  `<div class="card" data-box="${box}"><span>${label}</span><b>${value}</b><em class="${trend}" data-box="${box}-change">${change}</em></div>`;

// The app's screens. Dark is only for the Open Graph image, where a white page would glare.
const app = (screen: Screen, dark = false) => {
  const [width, height] = sizes[screen];
  const dashboard = screen === "dashboard";
  return html(
    `body{--bg:${dark ? "#0f0f10" : "#f5f6f8"};--panel:${dark ? "#18181b" : "#fff"};--fg:${dark ? "#f4f4f5" : "#1c2024"};--muted:${dark ? "#a1a1aa" : "#6b7280"};--line:${dark ? "#2a2a2e" : "#e2e4e9"};--blue:#2f5fe8;
  width:${width}px;height:${height}px;overflow:hidden;background:var(--bg);color:var(--fg);font:14px/1.3 Geist,sans-serif;padding:${dashboard ? "26px 28px" : "28px 32px"}}
header{display:flex;align-items:center;justify-content:space-between;margin-bottom:${dashboard ? 18 : 22}px}
h1{margin:0;font-size:${dashboard ? 21 : 19}px;letter-spacing:-.02em;font-weight:700}
h1 small{font-size:12px;font-weight:500;color:var(--muted);margin-left:8px;letter-spacing:0}
button,input{font:inherit;font-size:13px;color:var(--fg);background:var(--panel);border:1px solid var(--line);border-radius:7px;height:34px;padding:0 13px;white-space:nowrap;display:inline-flex;align-items:center}
.export{height:32px}
.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:14px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:13px 15px;display:flex;flex-direction:column;align-items:flex-start;gap:5px}
.card span{font-size:12px;color:var(--muted)}
.card b{font-size:23px;letter-spacing:-.02em}
.card em{font-style:normal;font-size:12.5px}
.up{color:#16a34a}.down{color:#dc2626}
.toolbar{display:flex;gap:9px;align-items:flex-start;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin-bottom:14px}
.toolbar.wraps{flex-wrap:wrap}
.toolbar input{width:${screen === "after" ? 132 : dashboard ? 150 : 150}px;color:var(--muted)}
.toolbar input::placeholder{color:var(--muted)}
.more{background:${dark ? "#1e2a4a" : "#eef2ff"};border-color:${dark ? "#33427a" : "#c7d2fe"};color:${dark ? "#c7d2fe" : "#3341a8"}}
.apply{margin-left:auto;background:var(--blue);border-color:var(--blue);color:#fff;font-weight:600}
.wraps .apply{margin-left:0;margin-top:6px}
table{width:100%;border-collapse:separate;border-spacing:0;background:var(--panel);border:1px solid var(--line);border-radius:10px;overflow:hidden;font-size:13px}
th,td{text-align:left;padding:9px 14px;border-bottom:1px solid var(--line)}
th{color:var(--muted);font-weight:500}
tbody tr:last-child td{border-bottom:0}
th:first-child{width:44%}
td.none{color:var(--muted)}`,
    `<header><h1><span data-box="title">Office correlations</span><small>Spurious</small></h1>${dashboard ? `<button class="export" data-box="export">Export CSV</button>` : ""}</header>` +
      (dashboard
        ? `<div class="cards">${card("Rubber ducks bought", "1,240", "−4.1% vs last week", "down", "ducks")}${card("Bugs fixed", "18", "−2.3% vs last week", "down", "bugs")}${card("Ducks vs. bugs", "r = 0.94", "+0.02 since the cat", "up", "r")}</div>`
        : "") +
      toolbar(screen) +
      table(dashboard ? 3 : 1),
  );
};

// Each marked element's box as a percentage of the screen, rounded the way the examples write it.
type Box = { x: number; y: number; w: number; h: number };
const round = (n: number) => Math.round(n * 10) / 10;
const props = ({ x, y, w, h }: Box) => `x=${x} y=${y} w=${w} h=${h}`;

async function shoot(browser: Browser, screen: Screen, dark: boolean) {
  const [width, height] = sizes[screen];
  const tab = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
  await tab.setContent(app(screen, dark), { waitUntil: "load" });
  await tab.evaluate(() => document.fonts.ready);
  const boxes = new Map<string, Box>();
  for (const element of await tab.locator("[data-box]").all()) {
    const name = await element.getAttribute("data-box");
    const box = await element.boundingBox();
    // A 3px margin, so a mark drawn on the box doesn't sit on the element's edge.
    if (name && box)
      boxes.set(name, {
        x: round(((box.x - 3) / width) * 100),
        y: round(((box.y - 3) / height) * 100),
        w: round(((box.width + 6) / width) * 100),
        h: round(((box.height + 6) / height) * 100),
      });
  }
  const png = await tab.screenshot();
  await tab.close();
  return { png, boxes };
}

const underlineMark = draw("underline", 200, 60, 0);
const underline = `<svg viewBox="${underlineMark.viewBox}" preserveAspectRatio="none" aria-hidden="true">${underlineMark.paths.map((d) => `<path d="${d}"/>`).join("")}</svg>`;
const logo = `<svg viewBox="0 0 32 32" aria-hidden="true"><rect stroke="#f5f5f5" x="6.5" y="11.4" width="19" height="10.2" fill="none" stroke-width="1.3"/><path fill="#f5f5f5" d="M7.87 20.24V12.76H10.07L12.26 15.51 14.46 12.76H16.66V20.24H14.46V15.95L12.26 18.7 10.07 15.95V20.24ZM18.64 12.98h2.19v2.12h-2.19ZM18.64 17.9h2.19v2.12h-2.19ZM21.94 12.98h2.19v2.12h-2.19ZM21.94 17.9h2.19v2.12h-2.19Z"/><path d="M9.3 7.3C15.3 3.7 27.1 4.5 28.7 11.5 30.4 19.1 22 26.7 12.8 27.2 5.9 27.6 2 23.5 3.5 18.1 4.8 13.3 11.1 9.7 18.1 9.6" fill="none" stroke="${red}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const browser = await chromium.launch();
try {
  const screens = new Map<Screen, Map<string, Box>>();
  const darkScreens = new Map<string, string>();
  for (const screen of ["before", "after", "dashboard"] as const) {
    const { png, boxes } = await shoot(browser, screen, false);
    await writeFile(new URL(`${screen}.png`, pub), png);
    screens.set(screen, boxes);
    darkScreens.set(`${screen}.png`, dataUrl((await shoot(browser, screen, true)).png));
    for (const [name, box] of boxes) console.log(`${screen}.png ${name}: ${props(box)}`);
  }

  // Annotate's README leads with side notes pointing into the dashboard.
  const dashboard = screens.get("dashboard")!;
  const readme = `::screenshot{src="/dashboard.png" alt="Office correlations dashboard"}
:::annotation{${props(dashboard.get("bugs-change")!)} mark="none" side="top"}
Bugs fixed fell with the duck supply.
:::

:::annotation{${props(dashboard.get("r")!)} mark="none" side="top"}
r now counts the office cat.
:::

:::annotation{${props(dashboard.get("missing")!)} mark="none" side="left"}
The pigeons ate week 15.
:::
::`;
  const readmeHtml = await render(
    readme,
    new Map([["dashboard.png", dataUrl(await readFile(new URL("dashboard.png", pub)))]]),
  );
  const tab = await browser.newPage({
    viewport: { width: 830, height: 900 },
    deviceScaleFactor: 2,
  });
  await tab.setContent(
    html(
      `body{padding:24px;font-family:Geist,sans-serif;color:#171717;background:#fff}`,
      readmeHtml,
    ),
    { waitUntil: "load" },
  );
  await tab.evaluate(() => document.fonts.ready);
  await tab
    .locator(".ca")
    .first()
    .screenshot({ path: new URL("readme.png", pub).pathname });
  await tab.close();

  await mkdir(new URL("og/", pub), { recursive: true });
  const index = await readFile(new URL("pages/index.md", root), "utf8");
  // The hero shows a broken block first and its fix last; the banner draws the fix.
  const hero = [
    ...(/^::hero\n([\s\S]*?^````)\n::$/m.exec(index)?.[1].matchAll(/````md\n([\s\S]*?)````/g) ??
      []),
  ].at(-1)?.[1];
  if (!hero) throw new Error("docs/pages/index.md needs a ::hero with a ````md block.");
  const example = await render(hero, darkScreens);
  for (const [file, width, height, scale] of [
    ["home.png", 1200, 630, 1],
    ["readme-banner.png", 1600, 560, 2],
  ] as const) {
    const og = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: scale,
      colorScheme: "dark",
    });
    await og.setContent(brand(file === "home.png", example), { waitUntil: "load" });
    await og.evaluate(() => document.fonts.ready);
    await og.screenshot({ path: new URL(`og/${file}`, pub).pathname });
    await og.close();
  }
} finally {
  await browser.close();
}

async function render(markdown: string, images: Map<string, string>) {
  const parsed = await parseMarkdown(markdown, { plugins: [annotate(), callouts()] });
  if (parsed.meta.issues.length) throw new Error(parsed.meta.issues.join("\n"));
  return (
    await renderHtmlFromDocument(parsed, {
      components: { ...annotateComponents, ...githubComponents },
    })
  ).replace(/src="\/([\w.-]+\.png)"/g, (_, file: string) => `src="${images.get(file)}"`);
}

// The Open Graph image and the banner share a layout. The banner is wider and shorter, so its window shrinks the
// page to show the notes too.
function brand(og: boolean, example: string) {
  const zoom = og ? 1 : 0.8;
  return html(
    `html,body{width:100%;height:100%;overflow:hidden}
body{--fg:#f5f5f5;--muted:#a3a3a3;--line:#262626;background:#0a0a0a;color:var(--fg);font-family:Geist,sans-serif;position:relative;
  background-image:radial-gradient(60rem 30rem at 85% 110%,rgb(229 72 77/.16),transparent 60%),
    linear-gradient(#ffffff08 1px,transparent 1px),linear-gradient(90deg,#ffffff08 1px,transparent 1px);
  background-size:auto,40px 40px,40px 40px}
.copy{position:absolute;left:${og ? 68 : 88}px;top:${og ? 64 : 72}px;bottom:${og ? 64 : 72}px;width:${og ? 560 : 760}px;display:flex;flex-direction:column}
.brand{display:flex;align-items:center;gap:14px;font-size:${og ? 26 : 28}px;font-weight:600;letter-spacing:-.01em}
.brand svg{width:${og ? 44 : 48}px;height:${og ? 44 : 48}px}
.copy h1{margin:auto 0 0;font-size:${og ? 64 : 76}px;line-height:1.02;letter-spacing:-.045em;font-weight:700}
.copy h1 .marked{position:relative;white-space:nowrap}
.copy h1 .marked svg{position:absolute;left:-4%;bottom:-.2em;height:.36em;width:108%;fill:none;stroke:${red};stroke-width:5;stroke-linecap:round;overflow:visible}
.copy p{margin:${og ? 22 : 26}px 0 0;font-size:26px;line-height:1.35;color:var(--muted);letter-spacing:-.01em}
.install{margin-top:auto;align-self:flex-start;font:500 22px/1 "Geist Mono",monospace;padding:16px 22px;border:1px solid #333;border-radius:12px;background:#141414}
.install span{color:${red}}
.window{position:absolute;right:${og ? -70 : 88}px;top:${og ? 150 : 48}px;width:${og ? 600 : 640}px;height:${og ? 560 : 464}px;border:1px solid #333;border-radius:16px;background:#141414;overflow:hidden;box-shadow:0 30px 80px #000c}
.bar{display:flex;align-items:center;gap:8px;height:44px;padding:0 16px;border-bottom:1px solid var(--line);font:14px "Geist Mono",monospace;color:var(--muted)}
.bar i{width:11px;height:11px;border-radius:50%;background:#3a3a3a}
.bar b{margin-left:10px;font-weight:400}
.page{zoom:${zoom};height:calc((100% - 44px) / ${zoom});padding:24px 28px;background:#111113;color:#e5e5e5;font-size:15px;line-height:1.5;--comark-radius:10px}
.page img{max-width:100%}
.page>:first-child{margin-top:0}`,
    `<div class="copy">
<div class="brand">${logo}comark ui</div>
<h1>Review documents,<br>written in <span class="marked">Markdown.${underline}</span></h1>
<p>Annotated screenshots, charts, tabs, icons,<br>and more. Plugins for Comark.</p>
<div class="install"><span>+</span>${plugins} plugins</div>
</div>
<div class="window"><div class="bar"><i></i><i></i><i></i><b>review.md, rendered</b></div><div class="page">${example}</div></div>`,
  );
}
