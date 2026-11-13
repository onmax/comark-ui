// A data-explorer page filters on a click anywhere a list filter's value is drawn: a bar, a legend entry, a category's
// axis label, a line under the pointer, a line's name and a matrix cell. Each click shows in the URL's hash, and the
// block clicked keeps every value and fades the others.
import { execFile, execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { expect, test, type Locator, type Page } from "@playwright/test";

const skill = fileURLToPath(new URL("../skills/data-explorer/", import.meta.url));

// The build runs where Vega isn't installed, so the page asks jsDelivr for it, and the test answers with comark-charts'.
const charts = createRequire(new URL("../packages/charts/package.json", import.meta.url));
const vega = {
  "vega@6": join(dirname(charts.resolve("vega")), "vega.min.js"),
  "vega-lite@6": join(dirname(charts.resolve("vega-lite")), "vega-lite.min.js"),
};

const months = ["2026-01-01", "2026-02-01", "2026-03-01", "2026-04-01"];
const teams = { Alpha: 30, Beta: 18, Gamma: 6 };
const report = {
  title: "Issue tracker",
  subtitle: "Test data",
  filters: [
    { field: "team", type: "list", label: "Teams", count: "byTeamType" },
    { field: "type", type: "list", label: "Types", count: "byTeamType" },
  ],
  data: {
    byTeamType: Object.entries(teams).flatMap(([team, n]) =>
      ["Bug", "Feature"].map((type, i) => ({ team, type, count: n + i * 4 })),
    ),
    byMonth: months.flatMap((date, i) =>
      Object.entries(teams).map(([team, n]) => ({ date, team, count: n + i })),
    ),
  },
  views: [
    {
      id: "overview",
      label: "Overview",
      blocks: [
        {
          type: "chart",
          chart: "stacked",
          title: "By team and type",
          data: "byTeamType",
          x: "team",
          y: "count",
          series: "type",
        },
        {
          type: "chart",
          chart: "line",
          title: "Per month",
          data: "byMonth",
          x: "date",
          y: "count",
          series: "team",
        },
        {
          type: "matrix",
          title: "Team by type",
          data: "byTeamType",
          x: "type",
          y: "team",
          value: "count",
        },
      ],
    },
  ],
};

let dir = "";
test.beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "data-explorer-clicks-"));
  writeFileSync(join(dir, "report.json"), JSON.stringify(report));
  execFileSync("node", [join(skill, "scripts/build.mjs"), "report.json", "report.html"], {
    cwd: dir,
  });
});
test.afterAll(() => rmSync(dir, { recursive: true, force: true }));

const chart = (page: Page, title: string) =>
  page
    .locator("section.rp-block")
    .filter({ has: page.locator("h3", { hasText: title }) })
    .locator("svg")
    .first();
const opacity = (locator: Locator) =>
  locator.evaluate((el) => Number(getComputedStyle(el).opacity));
const drawn = (page: Page) =>
  page.waitForFunction(
    () => document.querySelectorAll('.rp-chart[data-state="ok"] svg').length === 2,
  );

test("a click on a chart, a legend, an axis label or a matrix cell filters the page", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1300, height: 1400 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.route("https://cdn.jsdelivr.net/npm/**", (route) => {
    const name = Object.keys(vega).find((key) => route.request().url().includes(`/npm/${key}/`));
    return name
      ? route.fulfill({
          contentType: "text/javascript",
          body: readFileSync(vega[name as keyof typeof vega]),
        })
      : route.abort();
  });
  await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
  const url = pathToFileURL(join(dir, "report.html")).href;
  const after = async (click: () => Promise<unknown>) => {
    await page.goto(`${url}#overview`);
    await drawn(page);
    await click();
    await page.waitForFunction(() => location.hash.includes("?"));
    const hash = decodeURIComponent(await page.evaluate(() => location.hash));
    return new URLSearchParams(hash.split("?")[1]);
  };

  let hash = await after(() =>
    chart(page, "By team and type").locator('path[aria-label*="type: Feature"]').first().click(),
  );
  expect(hash.get("type")).toBe("Feature");
  await drawn(page);
  const bars = chart(page, "By team and type");
  await expect(bars.locator('.role-mark path[aria-label*="type: Bug"]')).toHaveCount(3);
  expect(await opacity(bars.locator('.role-mark path[aria-label*="type: Bug"]').first())).toBe(0.2);
  expect(await opacity(bars.locator('.role-mark path[aria-label*="type: Feature"]').first())).toBe(
    1,
  );
  expect(await opacity(bars.locator(".role-legend-label text", { hasText: "Bug" }))).toBe(0.2);

  hash = await after(() =>
    chart(page, "By team and type").locator(".role-legend-label text", { hasText: "Bug" }).click(),
  );
  expect(hash.get("type")).toBe("Bug");

  hash = await after(() =>
    chart(page, "By team and type").locator(".role-axis-label text", { hasText: "Gamma" }).click(),
  );
  expect(hash.get("team")).toBe("Gamma");
  await drawn(page);
  const label = (name: string) =>
    chart(page, "By team and type")
      .locator(".role-axis-label text", { hasText: name })
      .evaluate((el) => Number(getComputedStyle(el).fillOpacity));
  expect([await label("Alpha"), await label("Gamma")]).toEqual([0.2, 1]);

  hash = await after(() =>
    chart(page, "Per month")
      .locator(".role-mark text", { hasText: /^Beta$/ })
      .click(),
  );
  expect(hash.get("team")).toBe("Beta");
  await drawn(page);
  const lines = chart(page, "Per month");
  expect(await opacity(lines.locator(".role-mark text", { hasText: /^Alpha$/ }))).toBe(0.2);
  expect(await opacity(lines.locator(".role-mark text", { hasText: /^Beta$/ }))).toBe(1);

  // Away from any point, the hover layer takes the click, and the line nearest the pointer wins.
  hash = await after(async () => {
    const point = await chart(page, "Per month")
      .locator('.role-mark path[aria-label*="team: Alpha"]')
      .nth(1)
      .boundingBox();
    if (!point) throw new Error("Expected Alpha's second point on the line chart");
    await page.mouse.click(point.x + point.width / 2 + 12, point.y + point.height / 2 + 4);
  });
  expect(hash.get("team")).toBe("Alpha");

  hash = await after(() => page.locator(".rp-matrix td.is-click").last().click());
  expect([hash.get("team"), hash.get("type")]).toEqual(["Gamma", "Feature"]);
  await expect(page.locator(".rp-matrix td")).toHaveCount(6);
  await expect(page.locator(".rp-matrix td.is-dim")).toHaveCount(5);

  // A second click on the same value clears it.
  await page.locator(".rp-matrix td.is-click").last().click();
  await page.waitForFunction(() => !location.hash.includes("?"));
  expect(errors).toEqual([]);
});

async function buildPage(page: Page, name: string, input: unknown) {
  writeFileSync(join(dir, `${name}.json`), JSON.stringify(input));
  execFileSync("node", [join(skill, "scripts/build.mjs"), `${name}.json`, `${name}.html`], {
    cwd: dir,
  });
  await page.route("https://cdn.jsdelivr.net/npm/**", (route) => {
    const name = Object.keys(vega).find((key) => route.request().url().includes(`/npm/${key}/`));
    return name
      ? route.fulfill({
          contentType: "text/javascript",
          body: readFileSync(vega[name as keyof typeof vega]),
        })
      : route.abort();
  });
  await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
  await page.goto(pathToFileURL(join(dir, `${name}.html`)).href);
  await page.waitForFunction(() => document.body.dataset.ready === "overview");
}

test("literal columns draw marks and unsorted lines label the plotted endpoint", async ({
  page,
}) => {
  const data = [
    { "year.num": 2025, "issue.count": 50, "team.name": "Alpha" },
    { "year.num": 2023, "issue.count": 10, "team.name": "Alpha" },
    { "year.num": 2024, "issue.count": 30, "team.name": "Alpha" },
  ];
  await buildPage(page, "literal", {
    title: "Literal columns",
    data: { rows: data },
    views: [
      {
        id: "overview",
        label: "Overview",
        blocks: [
          { type: "chart", chart: "histogram", title: "Histogram", data: "rows", x: "issue.count" },
          ...["line", "area"].map((kind) => ({
            type: "chart",
            chart: kind,
            title: kind,
            data: "rows",
            x: "year.num",
            y: "issue.count",
            series: "team.name",
            ...(kind === "area" ? { stack: false } : {}),
            endValues: true,
          })),
        ],
      },
    ],
  });
  expect(
    await chart(page, "Histogram").locator('.role-mark path[aria-roledescription="bar"]').count(),
  ).toBeGreaterThan(0);
  for (const kind of ["line", "area"]) {
    const svg = chart(page, kind);
    await expect(svg.locator(`.role-mark path[aria-roledescription="${kind} mark"]`)).toHaveCount(
      1,
    );
    const label = svg.locator(".role-mark text", { hasText: "Alpha 50" });
    await expect(label).toHaveCount(1);
    await expect(label).toHaveAttribute("aria-label", /2025/);
    // The label sits at the rightmost plotted x, rather than the middle source row.
    const labelX = await label.evaluate((el) => el.getBoundingClientRect().x);
    const bounds = await svg.boundingBox();
    expect(labelX).toBeGreaterThan(bounds!.x + bounds!.width * 0.7);
  }
});

test("cleared list defaults survive reopening the URL", async ({ page }) => {
  await buildPage(page, "defaults", {
    title: "Defaults",
    filters: [{ field: "team", type: "list", label: "Teams", default: "Alpha", count: "rows" }],
    data: {
      rows: [
        { team: "Alpha", n: 1 },
        { team: "Beta", n: 2 },
      ],
    },
    top: [{ type: "stats", items: [{ label: "Total", value: { data: "rows", field: "n" } }] }],
    views: [
      {
        id: "overview",
        label: "Overview",
        blocks: [
          {
            type: "table",
            title: "Teams",
            data: "rows",
            columns: [{ field: "team", label: "Team" }],
          },
        ],
      },
    ],
  });
  for (const clear of [
    () => page.getByRole("button", { name: "Clear", exact: true }).click(),
    () => page.getByRole("button", { name: /Alpha/ }).click(),
  ]) {
    await expect(page.locator(".rp-stat-value")).toHaveText("1");
    await clear();
    await expect(page.locator(".rp-stat-value")).toHaveText("3");
    const url = page.url();
    await page.reload();
    await expect(page.locator(".rp-stat-value")).toHaveText("3");
    await page.goto(url.split("#")[0]!);
  }
});

for (const offline of [true, false])
  test(`--shots ${offline ? "rejects failed CDN startup" : "captures every view in three layouts"}`, async () => {
    test.setTimeout(60000);
    const cwd = mkdtempSync(join(dir, "shots-"));
    const moduleDir = join(cwd, "node_modules/playwright");
    mkdirSync(moduleDir, { recursive: true });
    writeFileSync(
      join(moduleDir, "package.json"),
      JSON.stringify({ name: "playwright", type: "module", main: "index.mjs" }),
    );
    const require = createRequire(createRequire(import.meta.url).resolve("@playwright/test"));
    const playwright = pathToFileURL(require.resolve("playwright")).href;
    // Use real Chromium, with deterministic CDN responses inside the build subprocess.
    writeFileSync(
      join(moduleDir, "index.mjs"),
      `
    import playwright from ${JSON.stringify(playwright)};
    const { chromium: real } = playwright;
    import { readFileSync } from "node:fs";
    export const chromium = { async launch(options) {
      const browser = await real.launch(options);
      return { close: () => browser.close(), async newPage(options) {
        const page = await browser.newPage(options);
        await page.route("https://fonts.googleapis.com/**", route => route.abort());
        await page.route("https://cdn.jsdelivr.net/npm/**", route => {
          if (${offline}) return route.abort();
          const files = ${JSON.stringify(vega)};
          const key = Object.keys(files).find(key => route.request().url().includes("/npm/" + key + "/"));
          return route.fulfill({ contentType: "text/javascript", body: readFileSync(files[key]) });
        });
        return page;
      }};
    }};
  `,
    );
    writeFileSync(
      join(cwd, "report.json"),
      JSON.stringify({
        title: "Screenshot verification",
        data: { teams: [{ team: "Alpha", count: 3 }] },
        views: ["overview", "second"].map((id) => ({
          id,
          label: id,
          blocks: [
            {
              type: "table",
              title: "Teams",
              data: "teams",
              columns: [
                { field: "team", label: "Team" },
                { field: "count", label: "Count" },
              ],
            },
          ],
        })),
      }),
    );
    let failure: Error | undefined;
    try {
      await promisify(execFile)(
        "node",
        [join(skill, "scripts/build.mjs"), "report.json", "report.html", "--shots", "shots"],
        { cwd, timeout: 45000 },
      );
    } catch (error) {
      failure = error as Error;
    }
    if (offline) {
      expect(failure?.message).toContain("report startup failed");
      expect(failure?.message).toContain("couldn't load https://cdn.jsdelivr.net");
      expect(readdirSync(join(cwd, "shots"))).toHaveLength(0);
    } else {
      expect(failure).toBeUndefined();
      expect(readdirSync(join(cwd, "shots"))).toHaveLength(6);
    }
  });
