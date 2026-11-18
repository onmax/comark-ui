import { createHtmlRenderer, renderHtmlFromDocument } from "@comark/html";
import { expect, type Page, test } from "@playwright/test";
import { parseMarkdown } from "comark";
import comarkUi from "../packages/ui/src/html.ts";

// How tableLayout's tables lay out. Column widths come from grid tracks and container queries, which engines size
// alike only if the spec holds them to it, so Chromium, Firefox, and WebKit each run these, from a file of their own.

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

// A review report's table: the status holds about twice the summary's text, and one preview cell has two chips.
const report = `| PR | Summary | Status / your next step | Preview | Working now |
|---|---|---|---|---|
| [#1610](https://github.com/acme/portal/pull/1610) | Stock warnings explain unusual order lines: the quantity against the item's average per order line. | Priya requested changes again this morning. The percentages look noisy with big numbers, so go back to the multiplier in the table and keep the percentage in the hover. The links point to a reservation, but the row shows past order lines. | [preview](https://example.com/1610) | Yes: an agent pushed at 08:57 and is watching the PR. |
| [#1596](https://github.com/acme/portal/pull/1596) | Each user keeps their own column layout in every table. | The feedback is pushed: a Columns menu with Reset to default, a dot when the layout differs, and column reordering. Checks are running. Check the preview, then ask Priya again. | [preview](https://example.com/1596) | No |
| [#1618](https://github.com/acme/portal/pull/1618) | The outlook chart reads from the solver's weekly table instead of building it in the warehouse. | Green. No reviewer. Ask Priya, and line it up with the solver release so both merge on the same day. | [preview](https://example.com/1618), [Nova](https://example.com/nova) | No |
`;

// One prose column beside short ones, which fits the column as it is.
const oneProse = `| Id | Description | Owner | Due |
|---|---|---|---|
| T-101 | The import job reads every supplier file in one pass and keeps going past a bad row, so one broken line no longer stops the whole night's import. Each skipped row is listed in the morning report. | Lena | Nov 20 |
| T-102 | Search keeps the filters a person picked when they go back to the list, and the list scrolls to the row they opened. | Tomas | Nov 22 |
`;

const side = "calc((100vw - 100%) / 2 - 1.5rem)";

// A 46rem column, the way a review doc lays out its text, in a window of the given width.
async function page(
  page: Page,
  width: number,
  options: { room?: boolean; markdown?: string; style?: string } = {},
) {
  const { room = true, markdown = prs, style = "" } = options;
  await page.setViewportSize({ width, height: 900 });
  const wide = room ? `--comark-wide-start:${side};--comark-wide-end:${side};` : "";
  await page.setContent(
    `<!doctype html><meta charset="utf-8"><style>body{margin:0}</style><main style="width:min(46rem, 100% - 2rem);margin:auto;${wide}${style}">${await render(markdown)}</main>`,
  );
  return page.evaluate(() => {
    const box = (node: Element) => node.getBoundingClientRect();
    const main = box(document.querySelector("main")!);
    const table = document.querySelector("main table")!;
    const row = table.querySelectorAll("tbody tr")[0]!;
    const rowCells = [...row.children].map(box);
    const [id, summary, status, links] = rowCells;
    const header = [...table.querySelectorAll("thead th")].map(box);
    return {
      main,
      table: box(table),
      grid: getComputedStyle(table).display === "grid",
      id: id!,
      summary: summary!,
      status: status!,
      links: links!,
      rowCells,
      header,
      // Each chip as its line boxes' tops: one box each, so no chip breaks inside.
      chips: [...table.querySelectorAll(".cp")].map((chip) =>
        [...chip.getClientRects()].map((rect) => Math.round(rect.top)),
      ),
      // How many lines each short cell of one value takes: its text's boxes, a line apart where it wraps.
      shortLines: [...table.querySelectorAll('tbody [data-short=""]')].flatMap((cell) => {
        const range = document.createRange();
        range.selectNodeContents(cell);
        const tops = [...range.getClientRects()]
          .filter((rect) => rect.width > 0)
          .map((rect) => rect.top);
        const line = parseFloat(getComputedStyle(cell).lineHeight);
        return tops.length
          ? [tops.filter((top) => top > Math.min(...tops) + line / 2).length + 1]
          : [];
      }),
      // Each cell of two chips or more: its chips' widths and how many lines they take.
      chipCells: [...table.querySelectorAll('tbody [data-short="chips"]')].map((cell) => ({
        width: box(cell).width,
        chips: [...cell.querySelectorAll(".cp")].map((chip) => box(chip).width),
        lines: new Set([...cell.querySelectorAll(".cp")].map((chip) => Math.round(box(chip).top)))
          .size,
      })),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
}

export function tableLayouts() {
  test("a wide table grows into the room beside the text, past the wide blocks' 72rem, and its short cells stay whole", async ({
    page: tab,
  }) => {
    const shown = await page(tab, 1600);
    expect(shown.table.width).toBeGreaterThan(72 * 16);
    expect(shown.table.width).toBeLessThanOrEqual(80 * 16);
    expect(shown.grid).toBe(true);
    // "portal #1596" never breaks into "#159" and "6", and no chip breaks inside.
    expect(shown.chips.length).toBe(6);
    for (const boxes of shown.chips) expect(boxes).toHaveLength(1);
    for (const lines of shown.shortLines) expect(lines).toBe(1);
    expect(shown.overflow).toBe(0);
  });

  test("a page's own --comark-wide-max still caps a wide table", async ({ page: tab }) => {
    const shown = await page(tab, 1600, { style: "--comark-wide-max:60rem;" });
    expect(shown.table.width).toBeCloseTo(60 * 16, 0);
  });

  test("side by side, a long column's width follows its text, and a column of chips is as narrow as its widest chip", async ({
    page: tab,
  }) => {
    const shown = await page(tab, 1600, { markdown: report });
    const [, summary, status, preview, working] = shown.header;
    // The status holds about twice the summary's text, and the working note the least.
    expect(status!.width).toBeGreaterThan(summary!.width * 1.15);
    expect(summary!.width).toBeGreaterThan(working!.width);
    // The preview column fits one chip, the comma after it, and its cell's padding, so a cell of two chips breaks
    // between them, not inside.
    const [cell] = shown.chipCells;
    expect(cell!.lines).toBe(2);
    expect(preview!.width).toBeLessThanOrEqual(Math.max(...cell!.chips) + 2 * 16 + 8);
    for (const boxes of shown.chips) expect(boxes).toHaveLength(1);
    expect(shown.overflow).toBe(0);
  });

  test("where the narrowest prose column would read a few words a line, the prose stacks under the first, lined up with the header", async ({
    page: tab,
  }) => {
    // A 34em column, under the 36em below which this table stacks and over the phone's 32em.
    const shown = await page(tab, 576, { room: false });
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

  test("without the room, a table whose prose still reads side by side keeps its columns", async ({
    page: tab,
  }) => {
    const shown = await page(tab, 1600, { room: false });
    expect(shown.table.width).toBeCloseTo(shown.main.width, 0);
    expect(shown.status.left).toBeGreaterThan(shown.summary.right - 1);
    expect(shown.status.top).toBeCloseTo(shown.summary.top, 0);
  });

  test("folded prose keeps its track beside several long numeric headings", async ({
    page: tab,
  }) => {
    const shown = await page(tab, 720, {
      markdown: `| Summary | Status | Average response time (milliseconds) | Successful requests per second | Peak memory usage (megabytes) | Average disk throughput (megabytes) |
|---|---|---|---|---|---|
| The report lists skipped supplier files so the importer can retry them later. | Checks are running; request a review after the preview deploys. | 20 | 100 | 182 | 300 |`,
    });
    const [summary, status, firstNumeric] = shown.rowCells;
    expect(status!.left).toBeCloseTo(summary!.left, 0);
    expect(status!.top).toBeGreaterThanOrEqual(summary!.bottom - 1);
    expect(summary!.width).toBeGreaterThanOrEqual(8 * 16);
    expect(Math.max(summary!.right, status!.right)).toBeLessThanOrEqual(firstNumeric!.left);
    expect(firstNumeric!.left).toBeCloseTo(shown.header[2]!.left, 0);
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

  test("a table with one prose column keeps its own layout in the column, and on a phone becomes one column per row", async ({
    page: tab,
  }) => {
    const desktop = await page(tab, 1600, { markdown: oneProse });
    expect(desktop.grid).toBe(false);
    expect(desktop.table.width).toBeLessThanOrEqual(desktop.main.width);
    const phone = await page(tab, 390, { markdown: oneProse });
    expect(phone.grid).toBe(true);
    // The description gets the whole width, not what the id, owner, and date leave it.
    expect(phone.summary.width).toBeCloseTo(phone.table.width, 0);
    expect(phone.summary.top).toBeGreaterThanOrEqual(phone.id.bottom - 1);
    expect(phone.overflow).toBe(0);
  });

  test("a grid without prose keeps its headers and scrolls on a phone", async ({ page: tab }) => {
    await page(tab, 390, {
      markdown: `| Task | Trace | Started | Finished | Status |
|---|---|---|---|---|
| 01K1B7R0JKVTH9X2MB3VMQZP4Y | 01K1B7R0M5B1H1PR3PZ1MGQ0DW | 2026-11-18 10:01:00 UTC | 2026-11-18 10:02:00 UTC | Success |`,
    });
    const table = tab.getByRole("table");
    await expect(table).toHaveAttribute("role", "table");
    await expect(table.getByRole("columnheader", { name: "Task" })).toBeInViewport();
    expect(
      await table.evaluate((node) => {
        const wrapper = node.parentElement!;
        return wrapper.scrollWidth - wrapper.clientWidth;
      }),
    ).toBeGreaterThan(1);
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
}
