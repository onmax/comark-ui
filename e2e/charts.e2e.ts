import { createHtmlRenderer } from "@comark/html";
import { expect, test } from "@playwright/test";
import annotate, { components as annotateComponents } from "../packages/annotate/src/html.ts";
import charts, { components } from "../packages/charts/src/html.ts";
import chips, { components as chipsComponents } from "../packages/chips/src/html.ts";

test("opening chart data includes its table margin in the animated height", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const render = createHtmlRenderer({ plugins: [charts()], components });
  await page.setContent(
    await render(
      '::chart{type="bar"}\n| Use | Value |\n| --- | ---: |\n| Gift cards | 1071 |\n| Hotel | 597 |\n::',
    ),
  );
  await page.addStyleTag({
    content: ".cch-data::details-content{transition-duration:5s,5s}",
  });
  const jump = await page.locator(".cch-data").evaluate(async (element) => {
    if (!(element instanceof HTMLDetailsElement)) throw new Error("Expected chart data details");
    await new Promise(requestAnimationFrame);
    const closed = element.getBoundingClientRect().height;
    element.open = true;
    for (let frame = 0; frame < 3; frame++) await new Promise(requestAnimationFrame);
    const height = element.getBoundingClientRect().height;
    const content = Number.parseFloat(getComputedStyle(element, "::details-content").blockSize);
    return height - closed - content;
  });
  expect(Math.abs(jump)).toBeLessThan(1);
});

// Worst-case tables a review really holds: file paths and test names, other scripts and emoji, one-letter names,
// a single row and sixty, two years of months and three days of hours, numbers from thousandths to millions, negatives,
// zeros, ties, empty cells, more series than the palette, and marks on the first and last rows.
const NAMES = [
  ["api", "web", "docs", "cli", "ui", "db", "auth", "jobs"],
  ["A", "B", "C", "D", "E", "F", "G", "H"],
  [
    "packages/annotate/src/components/ScreenshotFrame.vue",
    "e2e/annotate.e2e.ts › copies a zoomed screenshot with its marks",
    "docs/pages/getting-started/installation.md",
    "src/server/api/routes/billing/invoices/[id].get.ts",
    "packages/lint/test/cli.test.ts › exits with 1",
    "apps/web/app/(marketing)/pricing/page.tsx",
    "node_modules/.pnpm/vega@6.4.0/node_modules/vega/build/vega.module.js",
    "tests/integration/checkout-flow.spec.ts › applies a coupon",
  ],
  ["Kraków", "東京", "São Paulo", "Zürich", "القاهرة", "Reykjavík", "Москва", "Ho Chi Minh City"],
  ["🚀 launch", "🐛 bugs", "✨ features", "📦 deps", "🔥 hotfix", "📝 docs", "⚡ perf", "🧪 tests"],
  ["v0.1", "v0.2", "v0.10", "v1.0.0-beta.3", "v1.0", "v1.1", "v2.0.0-rc.1", "v2.0"],
  [
    "first contentful paint",
    "largest contentful paint",
    "time to interactive",
    "total blocking time",
    "cumulative layout shift",
    "speed index",
    "time to first byte",
    "interaction to next paint",
  ],
];
const pad = (n: number) => String(n).padStart(2, "0");
const DATES = [
  (n: number) => Array.from({ length: n }, (_, i) => String(2015 + i)),
  (n: number) =>
    Array.from(
      { length: n },
      (_, i) => `${2025 + Math.floor((i + 3) / 12)}-${pad(((i + 3) % 12) + 1)}`,
    ),
  (n: number) =>
    Array.from({ length: n }, (_, i) =>
      new Date(Date.UTC(2026, 8, 1 + i)).toISOString().slice(0, 10),
    ),
  (n: number) =>
    Array.from(
      { length: n },
      (_, i) => `2026-10-${pad(20 + Math.floor(i / 24))}T${pad(i % 24)}:00`,
    ),
];
const NUMBERS: ((i: number) => number)[] = [
  (i) => 5 + ((i * 37) % 40),
  (i) => ((i * 137) % 1000) / 1000,
  (i) => 1_000_000 + ((i * 7_919_011) % 9_000_000),
  (i) => ((i * 53) % 80) - 40,
  (i) => (i * 29) % 101,
  () => 0,
  () => 50,
  (i) => (i % 7 === 3 ? 12_000 : 1 + ((i * 13) % 20)),
];
const SERIES = ["before", "after", "p95", "p99", "mobile", "desktop", "tablet", "watch"];
const MARKS = ['mark="circle" color="red"', 'mark="box"', 'mark="check" color="green"'];
const format = (value: number) =>
  Math.abs(value) >= 1000 ? value.toLocaleString("en-US") : String(value);

function chart(type: string, x: string[], series: number, kind: number, n: number) {
  const make = NUMBERS[kind]!;
  const names = SERIES.slice(0, series);
  const rows = x.map(
    (value, row) =>
      `| ${value} | ${names.map((_, column) => ((row + column + n) % 9 === 4 ? "" : format(make(row * 8 + column + n)))).join(" | ")} |`,
  );
  const marks =
    n % 2
      ? [x[0]!, x.at(-1)!].map(
          (at, i) => `:::annotation{at="${at}" ${MARKS[(n + i) % 3]}}\nA note about ${at}.\n:::`,
        )
      : [];
  // Long names turn bars sideways, as a writer would ask, and every third chart that can prints its numbers.
  const flags = [
    (type === "bar" || type === "stacked") && x.some((value) => value.length > 12) && "horizontal",
    ["bar", "stacked", "waterfall", "dumbbell"].includes(type) && n % 3 === 0 && "labels",
  ].filter(Boolean);
  return [
    `::chart{type="${type}" ${flags.map((flag) => `${flag} `).join("")}title="${n % 5 ? `${type}, case ${n}` : "Median server response time for every authenticated API route, before and after the connection-pool change (ms)"}"}`,
    `| x | ${names.join(" | ")} |`,
    `| --- |${names.map(() => " --: |").join("")}`,
    ...rows,
    ...marks,
    "::",
  ].join("\n");
}

// Each gantt bar runs one to three steps from its own row's, so bars overlap, with a milestone every fifth row, a column
// of groups on every other chart, and marks on the first and last rows of every third.
function gantt(tasks: string[], times: string[], n: number) {
  const grouped = n % 2 === 0;
  const rows = tasks.map((task, row) => {
    const end = row % 5 === 4 ? row : row + 1 + (row % 3);
    return `| ${task} |${grouped ? ` ${SERIES[row % 3]} |` : ""} ${times[row]} | ${times[end]} |`;
  });
  const marks =
    n % 3
      ? []
      : [tasks[0]!, tasks.at(-1)!].map(
          (at, i) => `:::annotation{at="${at}" ${MARKS[(n + i) % 3]}}\nA note about ${at}.\n:::`,
        );
  return [
    `::chart{type="gantt" ${n % 2 ? "labels " : ""}title="gantt, case ${n}"}`,
    `| task |${grouped ? " group |" : ""} start | end |`,
    `| --- |${grouped ? " --- |" : ""} --: | --: |`,
    ...rows,
    ...marks,
    "::",
  ].join("\n");
}

const cases: string[] = [];
for (const type of ["bar", "stacked", "dumbbell", "waterfall", "pie"])
  for (const names of NAMES)
    for (const rows of [1, 3, 8]) {
      const n = cases.length;
      const series =
        type === "pie" || type === "waterfall"
          ? 1
          : type === "dumbbell"
            ? 2
            : [1, 2, 3, 6, 8][n % 5]!;
      cases.push(chart(type, names.slice(0, rows), series, n % NUMBERS.length, n));
    }
for (const type of ["line", "area", "bar", "stacked", "waterfall"])
  for (const dates of DATES)
    for (const rows of [2, 7, 24, 60]) {
      const n = cases.length;
      const series = type === "waterfall" ? 1 : [1, 2, 3, 6, 8][n % 5]!;
      cases.push(chart(type, dates(rows), series, n % NUMBERS.length, n));
    }
for (const rows of [2, 5, 20, 60])
  for (const kind of [0, 1, 2, 3]) {
    const n = cases.length;
    const x = Array.from({ length: rows }, (_, i) =>
      format([15, 0.0137, 120_000, 7][kind]! * (i + 1) - (kind === 3 ? 50 : 0)),
    );
    cases.push(
      chart(
        "scatter",
        x.map((value) => value.replace(/(\.\d{3})\d+/, "$1")),
        [1, 2, 3, 6][n % 4]!,
        kind,
        n,
      ),
    );
  }

for (const [kind, names] of NAMES.entries())
  for (const rows of [1, 8, 60]) {
    const tasks = Array.from({ length: rows }, (_, i) =>
      i < names.length
        ? names[i]!
        : `${names[i % names.length]} ${Math.floor(i / names.length) + 1}`,
    );
    const step = [0.001, 1.5, 120_000][(kind + rows) % 3]!;
    const times = Array.from({ length: rows + 3 }, (_, i) =>
      format(Number((i * step).toPrecision(6))),
    );
    cases.push(gantt(tasks, times, cases.length));
  }
for (const dates of DATES)
  for (const rows of [2, 7, 24]) {
    const tasks = Array.from({ length: rows }, (_, i) => `${NAMES[0]![i % 8]} ${i + 1}`);
    cases.push(gantt(tasks, dates(rows + 3), cases.length));
  }

// A budget per list of names: two incomes into a hub, and a flow from it to each name, from thousandths to millions,
// with amounts on every other chart and a mark on the hub of every third.
function flow(names: string[], n: number) {
  const make = NUMBERS[[0, 1, 2, 7][n % 4]!]!;
  const outs = names.map((_, row) => make(row * 8 + n) || 1);
  const total = outs.reduce((sum, value) => sum + value, 0);
  return [
    `::chart{type="sankey" ${n % 2 ? "labels " : ""}title="sankey, case ${n}"}`,
    "| from | to | amount |",
    "| --- | --- | --: |",
    `| salary | budget | ${format(Number((total * 0.9).toPrecision(6)))} |`,
    `| side project | budget | ${format(Number((total * 0.1).toPrecision(6)))} |`,
    ...names.map((name, row) => `| budget | ${name} | ${format(outs[row]!)} |`),
    ...(n % 3 ? [] : [':::annotation{at="budget" mark="circle"}\nWhere it all goes.\n:::']),
    "::",
  ].join("\n");
}
for (const names of NAMES)
  for (const rows of [1, 3, 8]) cases.push(flow(names.slice(0, rows), cases.length));

test("hundreds of worst-case charts draw with no text colliding, clipped, or past the column", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const render = createHtmlRenderer({
    plugins: [charts(), annotate()],
    components: { ...annotateComponents, ...components },
  });
  // One document, so the shared styles and scripts come once; each case is one figure, in order.
  const body = await render(cases.join("\n\n"));
  await page.route("**/fixture/", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><meta charset="utf-8"><style>main{width:720px}</style><main>${body}</main>`,
    }),
  );
  await page.goto("/fixture/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("figure.cch")).toHaveCount(cases.length);

  const problems = await page.evaluate(() => {
    const found: string[] = [];
    for (const [index, section] of document.querySelectorAll("figure.cch").entries()) {
      const where = `case ${index}`;
      const svg = section.querySelector(".cch-plot svg");
      if (!svg) {
        found.push(`${where}: not drawn`);
        continue;
      }
      const box = svg.getBoundingClientRect();
      if (box.width > section.querySelector(".cch-plot")!.getBoundingClientRect().width + 1)
        found.push(`${where}: ${Math.round(box.width)}px, wider than its card`);
      const texts = [...svg.querySelectorAll("text")]
        .filter((text) => text.textContent?.trim() && text.getAttribute("opacity") !== "0")
        .map((text) => ({
          text: text.textContent!.trim(),
          rect: text.getBoundingClientRect(),
          // Angled labels have axis-aligned boxes that overlap where the glyphs don't.
          angled: /rotate\((?!0\))/.test(text.getAttribute("transform") ?? ""),
        }));
      for (const { text, rect } of texts) {
        if (text.includes("items omitted")) found.push(`${where}: dropped rows`);
        if (
          rect.left < box.left - 1 ||
          rect.right > box.right + 1 ||
          rect.top < box.top - 1 ||
          rect.bottom > box.bottom + 1
        )
          found.push(`${where}: "${text}" is clipped`);
      }
      for (const [i, a] of texts.entries())
        for (const b of texts.slice(i + 1)) {
          if (a.angled && b.angled) continue;
          const apart = Math.max(
            b.rect.left - a.rect.right,
            a.rect.left - b.rect.right,
            b.rect.top - a.rect.bottom,
            a.rect.top - b.rect.bottom,
          );
          if (apart < 3)
            found.push(`${where}: "${a.text}" and "${b.text}" are ${apart.toFixed(1)}px apart`);
        }
      const frame = section.querySelector(".ca-frame")?.getBoundingClientRect();
      for (const mark of frame ? section.querySelectorAll(".ca-mark") : []) {
        const rect = mark.getBoundingClientRect();
        if (
          rect.left < frame!.left - 1 ||
          rect.right > frame!.right + 1 ||
          rect.top < frame!.top - 1 ||
          rect.bottom > frame!.bottom + 1
        )
          found.push(`${where}: a mark sits outside the chart`);
      }
    }
    return found;
  });
  expect(problems).toEqual([]);
});

test("a chart beside a link keeps its own card, light and dark", async ({ page }) => {
  const render = createHtmlRenderer({
    plugins: [charts(), chips({ download: false })],
    components: { ...components, ...chipsComponents },
  });
  const body = await render(
    '::chart{title="Pigeons"}\n| day | pigeons |\n| --- | --: |\n| Monday | 3 |\n| Friday | 14 |\n::\n\nSee [Vite](https://vite.dev).',
  );
  await page.route("**/fixture/", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><meta charset="utf-8"><main>${body}</main>`,
    }),
  );
  await page.goto("/fixture/", { waitUntil: "domcontentloaded" });
  const figure = page.locator("figure.cch");
  await expect(page.locator("main a").first()).toHaveCSS("border-top-left-radius", "6px");
  for (const [scheme, background] of [
    ["light", "rgb(255, 255, 255)"],
    ["dark", "rgb(10, 10, 10)"],
  ] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await expect(figure).toHaveCSS("background-color", background);
    await expect(figure).toHaveCSS("border-top-left-radius", "10px");
  }
});

test("a chart copies as an image in the page's colors, and its data as a table or Markdown", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const render = createHtmlRenderer({ plugins: [charts()], components });
  const body = await render(
    '::chart{title="Pigeons"}\n| day | pigeons |\n| --- | --: |\n| Monday | 3 |\n| Friday | 14 |\n::',
  );
  // A theme color only the page's rules give the bars, so a copy that missed them would draw Flint's own.
  await page.route("**/fixture/", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><meta charset="utf-8"><style>:root{--comark-chart-1:rgb(255,0,0)}</style><main>${body}</main>`,
    }),
  );
  await page.goto("/fixture/", { waitUntil: "domcontentloaded" });
  const figure = page.locator("figure.cch");
  const copy = page.getByRole("button", { name: "Copy the chart as an image" });
  const bar = page.locator(".cch-bar");
  await expect(bar).toHaveCSS("opacity", "0");
  await figure.hover();
  await expect(bar).toHaveCSS("opacity", "1");

  await copy.click();
  await expect(page.locator(".cch-status")).toHaveText("Copied as image");
  const image = await page.evaluate(async () => {
    const [item] = await navigator.clipboard.read();
    const bitmap = await createImageBitmap(await item!.getType("image/png"));
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d")!;
    context.drawImage(bitmap, 0, 0);
    const { data } = context.getImageData(0, 0, bitmap.width, bitmap.height);
    let red = 0;
    for (let index = 0; index < data.length; index += 4)
      if (data[index]! > 240 && data[index + 1]! < 20 && data[index + 2]! < 20) red++;
    return { width: bitmap.width, red };
  });
  const plot = await page.locator(".cch-plot>svg").boundingBox();
  expect(image.width).toBe(Math.round((plot!.width + 32) * 2));
  expect(image.red).toBeGreaterThan(1000);

  const clipboard = () => page.evaluate(() => navigator.clipboard.readText());
  const more = page.getByRole("button", { name: "More ways to copy" });
  await more.click();
  await expect(page.getByRole("menuitem")).toHaveCount(2);
  await expect(page.getByRole("menuitem", { name: /Table/ })).toBeFocused();
  await page.getByRole("menuitem", { name: /Table/ }).click();
  await expect(page.locator(".cch-status")).toHaveText("Copied as table");
  expect(await clipboard()).toBe("day\tpigeons\nMonday\t3\nFriday\t14");
  await expect(more).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("End");
  await expect(page.getByRole("menuitem", { name: /Markdown/ })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu")).toBeHidden();
  expect(await clipboard()).toBe(
    "| day | pigeons |\n| --- | --- |\n| Monday | 3 |\n| Friday | 14 |",
  );
});

test("a side note on a chart narrower than its card starts where its arrow ends", async ({
  page,
}) => {
  const render = createHtmlRenderer({ plugins: [charts()], components });
  const chart = (side: string) =>
    `::chart{labels title="Minutes to the first review comment"}\n| team | minutes |\n| --- | --: |\n| frontend | 38 |\n| backend | 64 |\n| design | 12 |\n:::annotation{mark="line" value="45" color="red" side="${side}"}\nTeam goal: 45 min.\n:::\n::`;
  const body = await render(`${chart("right")}\n\n${chart("left")}`);
  await page.route("**/fixture/", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><meta charset="utf-8"><main style="max-width:768px;margin:auto">${body}</main>`,
    }),
  );
  await page.goto("/fixture/", { waitUntil: "domcontentloaded" });
  const gaps = await page.locator("figure.cch").evaluateAll((figures) =>
    figures.map((figure) => {
      const arrow = figure.querySelector(".ca-arrow")!.getBoundingClientRect();
      const note = figure.querySelector(".ca-callout")!.getBoundingClientRect();
      return Math.round(
        Math.min(Math.abs(note.left - arrow.right), Math.abs(arrow.left - note.right)),
      );
    }),
  );
  expect(gaps).toEqual([0, 0]);
});
