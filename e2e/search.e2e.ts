import { existsSync, readdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

for (const path of ["/", "/play/"]) {
  test(`search finds the editor and its APIs from ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.keyboard.press("Control+k");
    const field = page.getByRole("combobox", { name: "Search the docs" });
    await field.fill("editor");
    await expect(page.getByRole("option").first()).toHaveAttribute("href", "/guide/editor/");
    await expect(page.locator('.search-results a[href="/play/editor/"]')).toBeVisible();
    for (const query of [
      "wysiwyg",
      "useComarkEditor",
      "fromMarkdown",
      "createEditorCodec",
      "uploads",
    ]) {
      await field.fill(query);
      await expect(page.locator('.search-results a[href^="/guide/editor/"]').first()).toBeVisible();
    }
    await field.fill("editor");
    await field.press("Enter");
    await expect(page).toHaveURL(/\/guide\/editor\/$/);
    await expect(page.locator("h1")).toHaveText("Editor");
    await expect(page.locator('main a[href="/getting-started/"]')).toBeVisible();
  });
}

test("every docs page has a search entry", async ({ request }) => {
  const response = await request.get("/search.json");
  expect(response.ok()).toBe(true);
  const entries: { k: string; h: string }[] = await response.json();
  const routes = (dir: string, base: string) =>
    readdirSync(dir, { recursive: true, encoding: "utf8" })
      .filter((file) => file.endsWith(".md") && !file.startsWith("partials/"))
      .map((file) => `${base}/${file.replace(/(^|\/)?index\.md$|\.md$/, "")}`.replace(/\/?$/, "/"));
  const pages = [
    ...routes("docs/pages", ""),
    ...readdirSync("packages")
      .filter((folder) => existsSync(`packages/${folder}/docs/index.md`))
      .flatMap((folder) => routes(`packages/${folder}/docs`, `/${folder}`)),
    "/play/",
    "/play/editor/",
    "/play/gallery/",
  ];
  expect(
    entries
      .filter((entry) => entry.k !== "heading")
      .map((entry) => entry.h)
      .sort(),
  ).toEqual(pages.sort());
});

test("search finds the stylesheet imports and Mermaid style helper", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Control+k");
  const field = page.getByRole("combobox", { name: "Search the docs" });
  for (const [query, path] of [
    ["comark-code/style.css", "/code/"],
    ["comark-tabs/style.css", "/tabs/"],
    ["addMermaidStyles", "/mermaid/"],
  ]) {
    await field.fill(query);
    await expect(page.locator(`.search-results a[href^="${path}"]`).first()).toBeVisible();
  }
});

test("the editor playground is linked from docs and edits both ways", async ({ page }) => {
  await page.goto("/guide/editor/");
  await page.getByRole("link", { name: "Open the editor playground", exact: true }).click();
  await expect(page).toHaveURL(/\/play\/editor\/$/);
  await expect(page.getByRole("heading", { name: "Editor playground", exact: true })).toBeVisible();
  const markdown = page.getByRole("textbox", { name: "Markdown", exact: true });
  const rich = page.getByRole("textbox", { name: "Rich text", exact: true });
  await markdown.fill("# Updated title\n\nA new paragraph.\n");
  await expect(rich).toContainText("Updated title");
  await rich.fill("Changed in rich text");
  await expect(markdown).toHaveValue(/Changed in rich text/);
  await markdown.fill("Text <!-- hidden --> more\n");
  await expect(rich).toHaveAttribute("contenteditable", "false");
  await expect(page.getByRole("status")).toContainText("Read-only");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expect(
    page.getByRole("link", { name: "Markdown playground", exact: true }),
  ).toHaveAttribute("href", "/play/");
});
