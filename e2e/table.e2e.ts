import { createHtmlRenderer } from "@comark/html";
import { expect, test } from "@playwright/test";
import table, { components } from "../packages/table/src/html.ts";

const render = createHtmlRenderer({ plugins: [table()], components });
const markdown = '::table{sort}\n```csv\nBird,Seen\nPigeon,"1,204"\nHeron,9\nMallard,10\n```\n::';

test("sortable headers keep a visible keyboard focus ring", async ({ page }) => {
  await page.setContent(`<!doctype html><html><body>${await render(markdown)}</body></html>`);
  const bird = page.getByRole("button", { name: "Bird" });
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(bird).toBeFocused();
  await expect(bird).not.toHaveCSS("box-shadow", "none");
});

test("a table sorts by a header, numbers as numbers, and copies as a table, Markdown, and CSV", async ({
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

  const clipboard = () => page.evaluate(() => navigator.clipboard.readText());
  // The main button copies the table as cells for a spreadsheet, with tab-separated text beside them.
  await page.getByRole("button", { name: "Copy table" }).click();
  await expect(page.locator(".ctb-status")).toHaveText("Copied as table");
  expect(await clipboard()).toBe("Bird\tSeen\nHeron\t9\nMallard\t10\nPigeon\t1,204");
  const html = await page.evaluate(async () => {
    const [item] = await navigator.clipboard.read();
    return item ? (await item.getType("text/html")).text() : "";
  });
  expect(html).toContain("<thead><tr><th>Bird</th><th>Seen</th></tr></thead>");

  const more = page.getByRole("button", { name: "More ways to copy" });
  await more.click();
  await expect(more).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("menuitem")).toHaveCount(2);
  await page.getByRole("menuitem", { name: /Markdown/ }).click();
  await expect(page.getByRole("menu")).toBeHidden();
  await expect(more).toBeFocused();
  expect(await clipboard()).toBe(
    "| Bird | Seen |\n| --- | --- |\n| Heron | 9 |\n| Mallard | 10 |\n| Pigeon | 1,204 |",
  );

  // The keyboard opens the menu on its first item, moves through it with arrows, and closes it with Escape.
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: /Markdown/ })).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(page.getByRole("menuitem", { name: /CSV/ })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator(".ctb-status")).toHaveText("Copied as CSV");
  expect(await clipboard()).toBe('Bird,Seen\nHeron,9\nMallard,10\nPigeon,"1,204"');
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toBeHidden();
  await expect(more).toBeFocused();
});

test("without the script, the headers read as text and the copy buttons stay hidden", async ({
  page,
}) => {
  const html = (await render(markdown)).replace(/<script>[\s\S]*?<\/script>/g, "");
  await page.setContent(`<!doctype html><html><body>${html}</body></html>`);
  await expect(page.locator(".ctb-bar")).toBeHidden();
  await expect(page.locator(".ctb-sort").first()).toHaveCSS("cursor", "auto");
});
