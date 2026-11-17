import { createHtmlRenderer, renderHtmlFromDocument } from "@comark/html";
import { expect, type Page, test } from "@playwright/test";
import { parseMarkdown } from "comark";
import comarkUi from "../packages/ui/src/html.ts";

const preset = comarkUi({
  chips: { download: false },
  badge: { download: false },
  icon: { fetch: false },
  diagrams: { draw: false },
});
const render = createHtmlRenderer(preset);

// A review doc's table of pull requests: short ids and links, and two prose columns.
const prs = `| PR | Summary | Status / your next step | Links |
|---|---|---|---|
| [portal #1596](https://github.com/acme/portal/pull/1596) | Each user keeps their own column layout in every table | Christopher requested changes: show when the layout differs from the default and add a reset button. Main was merged in at 10:08, so it has no conflicts now. | [preview](https://example.com) [drop](https://example.com/d) |
| [portal #1610](https://github.com/acme/portal/pull/1610) | Alert details describe demand line outliers: the quantity against the SKU's average per demand line, instead of "Alert details are unavailable." | Preview deployed, e2e running, no reviewer. Check the before/after, then request Christopher. | [preview](https://example.com) |
| [website #33](https://github.com/acme/website/pull/33) | Planning guides and a Netstock comparison | Green, no reviewer. Request Christopher. | |
`;

const side = "calc((100vw - 100%) / 2 - 1.5rem)";

// A 46rem column, the way a review doc lays out its text, in a window of the given width.
async function page(page: Page, width: number, room = true) {
  await page.setViewportSize({ width, height: 900 });
  const style = room ? `--comark-wide-start:${side};--comark-wide-end:${side};` : "";
  await page.setContent(
    `<!doctype html><meta charset="utf-8"><style>body{margin:0}</style><main style="width:min(46rem, 100% - 2rem);margin:auto;${style}">${await render(prs)}</main>`,
  );
  return page.evaluate(() => {
    const box = (node: Element) => node.getBoundingClientRect();
    const main = box(document.querySelector("main")!);
    const table = document.querySelector("main table")!;
    const row = table.querySelectorAll("tbody tr")[0]!;
    const [id, summary, status, links] = [...row.children].map(box);
    const header = [...table.querySelectorAll("thead th")].map(box);
    return {
      main,
      table: box(table),
      grid: getComputedStyle(table).display === "grid",
      id: id!,
      summary: summary!,
      status: status!,
      links: links!,
      header,
      // Each chip in a short column as its line boxes' tops: one box each, all on one line.
      chips: [...table.querySelectorAll("[data-short] .cp")].map((chip) =>
        [...chip.getClientRects()].map((rect) => Math.round(rect.top)),
      ),
      cellLines: [...table.querySelectorAll("tbody [data-short]")].map(
        (cell) =>
          new Set(
            [...cell.querySelectorAll(".cp")].map((chip) =>
              Math.round(chip.getBoundingClientRect().top),
            ),
          ).size,
      ),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
}

test("a wide table grows into the room beside the text, and its short columns stay on one line", async ({
  page: tab,
}) => {
  const shown = await page(tab, 1600);
  expect(shown.table.width).toBeGreaterThan(shown.main.width + 100);
  expect(shown.table.width).toBeLessThanOrEqual(72 * 16);
  expect(shown.grid).toBe(false);
  // One line each, chips included: "portal #1596" never breaks into "#159" and "6".
  expect(shown.chips.length).toBe(6);
  for (const boxes of shown.chips) expect(boxes).toHaveLength(1);
  for (const lines of shown.cellLines) expect(lines).toBeLessThanOrEqual(1);
  expect(shown.overflow).toBe(0);
});

test("without the room, its prose columns stack: the status under the summary, lined up with the header", async ({
  page: tab,
}) => {
  const shown = await page(tab, 1600, false);
  expect(shown.table.width).toBeCloseTo(shown.main.width, 0);
  expect(shown.grid).toBe(true);
  expect(shown.status.left).toBeCloseTo(shown.summary.left, 0);
  expect(shown.status.top).toBeGreaterThanOrEqual(shown.summary.bottom - 1);
  // The id and the links span both lines of the row, in the columns their headers head.
  expect(shown.id.left).toBeCloseTo(shown.header[0]!.left, 0);
  expect(shown.links.left).toBeCloseTo(shown.header[3]!.left, 0);
  expect(shown.summary.left).toBeCloseTo(shown.header[1]!.left, 0);
  expect(shown.id.height).toBeLessThan(shown.summary.height + shown.status.height + 1);
  expect(shown.overflow).toBe(0);
});

test("on a phone each row becomes one column: the id, the summary, the status, then the links", async ({
  page: tab,
}) => {
  const shown = await page(tab, 390);
  expect(shown.grid).toBe(true);
  for (const cell of [shown.summary, shown.status, shown.links])
    expect(cell.left).toBeCloseTo(shown.id.left, 0);
  expect(shown.summary.top).toBeGreaterThanOrEqual(shown.id.bottom - 1);
  expect(shown.status.top).toBeGreaterThanOrEqual(shown.summary.bottom - 1);
  expect(shown.links.top).toBeGreaterThanOrEqual(shown.status.bottom - 1);
  expect(shown.table.right).toBeLessThanOrEqual(390);
  expect(shown.overflow).toBe(0);
});

for (const binding of ['note="Check"', ':note="data.note"']) {
  test(`comments preserve wide and phone table layouts: ${binding}`, async ({ page }) => {
    const doc = await parseMarkdown(`Intro :comment[text]{${binding}}\n\n${prs}`, preset);
    const output = await renderHtmlFromDocument(doc, { ...preset, data: { note: "Why?" } });
    for (const width of [1600, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.setContent(
        `<style>body{margin:0}</style><main style="width:min(46rem, 100% - 2rem);margin:auto;--comark-wide-start:${side};--comark-wide-end:${side}">${output}</main>`,
      );
      const layout = await page.evaluate(() => {
        const table = document.querySelector("main table")!;
        const wrapper = table.parentElement!;
        const cells = [...table.querySelectorAll("tbody tr:first-child td")].map((cell) =>
          cell.getBoundingClientRect(),
        );
        return {
          width: table.getBoundingClientRect().width,
          grid: getComputedStyle(table).display,
          container: getComputedStyle(wrapper).containerType,
          left: cells.map((cell) => cell.left),
        };
      });
      expect(layout.container).toBe("inline-size");
      if (width === 1600) expect(layout.width).toBeGreaterThan(836);
      else {
        expect(layout.grid).toBe("grid");
        for (const left of layout.left) expect(left).toBeCloseTo(layout.left[0]!, 0);
      }
    }
  });
}

test("long numeric column headers wrap without horizontal scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.setContent(
    `<style>body{margin:0}</style><main style="width:min(46rem, 100% - 2rem);margin:auto">${await render("| Average response time (milliseconds) | Successful requests per second |\n|---|---|\n| 20 | 100 |")}</main>`,
  );
  expect(
    await page
      .locator("th")
      .first()
      .evaluate((cell) => getComputedStyle(cell).whiteSpace),
  ).toBe("normal");
  expect(
    await page.locator("table").evaluate((table) => table.scrollWidth - table.clientWidth),
  ).toBeLessThanOrEqual(1);
});
