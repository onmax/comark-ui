import { createHtmlRenderer } from "@comark/html";
import { expect, test } from "@playwright/test";
import table, { components } from "../packages/table/src/html.ts";

const render = createHtmlRenderer({ plugins: [table()], components });
const markdown = '::table{sort}\n```csv\nBird,Seen\nPigeon,"1,204"\nHeron,9\nMallard,10\n```\n::';

test("a table sorts by a header, numbers as numbers, and copies as CSV and Markdown", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  // The clipboard needs a secure context, which a blank page isn't, so the content goes on the server's origin.
  await page.goto("/");
  await page.setContent(`<!doctype html><html><body>${await render(markdown)}</body></html>`);
  const column = (index: number) =>
    page.locator(`.ctb tbody td:nth-child(${index})`).allTextContents();
  const seen = page.getByRole("button", { name: "Seen" });
  await seen.click();
  expect(await column(2)).toEqual(["9", "10", "1,204"]);
  await expect(page.locator("th").nth(1)).toHaveAttribute("aria-sort", "ascending");
  await seen.click();
  expect(await column(1)).toEqual(["Pigeon", "Mallard", "Heron"]);
  await page.getByRole("button", { name: "Bird" }).click();
  expect(await column(1)).toEqual(["Heron", "Mallard", "Pigeon"]);
  await expect(page.locator("th").nth(1)).not.toHaveAttribute("aria-sort");

  await page.getByRole("button", { name: "Copy as CSV" }).click();
  await expect(page.locator(".ctb-status")).toHaveText("Copied CSV");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    'Bird,Seen\nHeron,9\nMallard,10\nPigeon,"1,204"',
  );
  await page.getByRole("button", { name: "Copy as Markdown" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "| Bird | Seen |\n| --- | --- |\n| Heron | 9 |\n| Mallard | 10 |\n| Pigeon | 1,204 |",
  );
});

test("without the script, the headers read as text and the copy buttons stay hidden", async ({
  page,
}) => {
  const html = (await render(markdown)).replace(/<script>[\s\S]*?<\/script>/g, "");
  await page.setContent(`<!doctype html><html><body>${html}</body></html>`);
  await expect(page.locator(".ctb-bar")).toBeHidden();
  await expect(page.locator(".ctb-sort").first()).toHaveCSS("cursor", "auto");
});
