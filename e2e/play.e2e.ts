import { expect, test } from "@playwright/test";

test("the playground renders a preset, reports issues as you type, and opens a shared link", async ({
  page,
}) => {
  await page.goto("/play/#preset=github-callouts");
  const preview = page.frameLocator(".play-preview");
  await expect(preview.locator(".cgc").first()).toBeVisible();
  await expect(page.locator(".sidebar .pages a[aria-current]")).toHaveText("Callouts");
  const npmx = page.locator(".top a.npmx");
  await expect(npmx).toHaveAttribute("href", "https://npmx.dev/package/comark-github");

  const editor = page.getByRole("textbox", { name: "Markdown" });
  await editor.fill('::screenshot{src="/after.png"}\n::');
  await expect(page.getByRole("list", { name: "Issues" })).toContainText("`alt` is required");
  await expect(preview.getByRole("figure")).toBeVisible();
  await expect(page.locator(".sidebar .pages a[aria-current]")).toHaveCount(0);
  await expect(page).toHaveURL(/#md=/);

  const shared = page.url();
  await page.goto("/");
  await page.goto(shared);
  await expect(editor).toHaveValue('::screenshot{src="/after.png"}\n::');
  await expect(npmx).toHaveAttribute("href", "https://npmx.dev/package/comark-ui");
  await expect(page.getByRole("list", { name: "Issues" })).toContainText("`alt` is required");
});

test("Reset asks before it brings back the example, and Copy copies the open pane", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/play/#preset=github-callouts");
  const editor = page.getByRole("textbox", { name: "Markdown" });
  const example = await editor.inputValue();
  const reset = page.getByRole("button", { name: "Reset to the example" });
  await expect(reset).toBeHidden();

  await editor.fill("Mine.");
  await expect(reset).toBeVisible();
  await page.getByRole("button", { name: "Copy the Markdown" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("Mine.");

  await reset.click();
  const dialog = page.getByRole("dialog", { name: "Reset to the example?" });
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(editor).toHaveValue("Mine.");

  await reset.click();
  await dialog.getByRole("button", { name: "Reset" }).click();
  await expect(editor).toHaveValue(example);
  await expect(reset).toBeHidden();
  await expect(page.locator(".sidebar .pages a[aria-current]")).toHaveText("Callouts");
});

test("an example's Playground link opens its Markdown in the playground", async ({ page }) => {
  await page.goto("/github/");
  const source = await page.locator(".example-code code").first().textContent();
  await page.locator(".example-play").first().click();
  await expect(page).toHaveURL(/\/play\/#md=/);
  await expect(page.getByRole("textbox", { name: "Markdown" })).toHaveValue(
    (source ?? "").trimEnd(),
  );
  await expect(page.frameLocator(".play-preview").locator(".cgc").first()).toBeVisible();
});

test("the playground puts comark-code's buttons on code blocks, and actions from the config", async ({
  page,
}) => {
  await page.goto("/play/#preset=code-copy-and-wrap");
  const preview = page.frameLocator(".play-preview");
  await expect(preview.getByRole("button", { name: "Copy code" })).toBeAttached();
  await expect(preview.getByRole("button", { name: "Run" })).toHaveCount(0);

  await page.getByRole("button", { name: "Config" }).click();
  await page
    .getByRole("textbox", { name: "Config" })
    .fill(
      '{ "comark-code": { "actions": [{ "id": "run", "label": "Run", "languages": ["sh"] }] } }',
    );
  await expect(preview.getByRole("button", { name: "Run" })).toBeAttached();
});

test("search opens with Ctrl+K and goes to the heading you pick", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Control+k");
  const field = page.getByRole("combobox", { name: "Search the docs" });
  await expect(field).toBeFocused();
  await field.fill("side notes");
  await expect(page.getByRole("option").first()).toContainText("Components › Annotate");
  await field.press("Enter");
  await expect(page).toHaveURL(/\/annotate\/#side-notes$/);
  await page.keyboard.press("Control+k");
  // A typo, a word only a page's keywords say, and a word only a section's text says.
  const first = page.getByRole("option").first();
  await field.fill("gannt");
  await expect(first).toHaveAttribute("href", "/charts/#gantt-charts");
  await field.fill("lightbox");
  await expect(first).toHaveAttribute("href", "/zoom/");
  await field.fill("diamond");
  await expect(first).toHaveAttribute("href", "/charts/#gantt-charts");
  await expect(first.locator("p mark")).toHaveText("diamond");
  await field.fill("zzzz");
  await expect(page.getByRole("status")).toHaveText("No page or heading matches.");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("the Theme pane themes the preview without rendering it again, light or dark, and a link keeps it", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/play/#preset=carousel-images");
  const preview = page.frameLocator(".play-preview");
  const next = preview.locator(".cc").first().getByRole("button", { name: "Next slide" });
  await expect(next).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await preview.locator("body").evaluate((body) => (body.dataset.rendered = "once"));

  await page.getByRole("button", { name: "Theme", exact: true }).click();
  await page.getByRole("textbox", { name: "Background", exact: true }).fill("rgb(1 2 3)");
  await expect(next).toHaveCSS("background-color", "rgb(1, 2, 3)");
  await expect(preview.locator("body")).toHaveAttribute("data-rendered", "once");

  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await expect(next).toHaveCSS("border-top-color", "rgba(255, 255, 255, 0.1)");
  await page.getByRole("button", { name: "Copy CSS" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    ":root {\n  --comark-background: rgb(1 2 3);\n}",
  );

  // The link is written a moment after the last change, deflated like the Markdown.
  const linkedTheme = () =>
    page.evaluate(async () => {
      const code = new URLSearchParams(location.hash.slice(1)).get("theme") ?? "";
      const binary = atob(code.replaceAll("-", "+").replaceAll("_", "/"));
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      return new Response(stream).text().catch(() => "");
    });
  await expect.poll(linkedTheme).toContain('"scheme":"dark"');
  const shared = page.url();
  await page.goto("/");
  await page.goto(shared);
  await expect(next).toHaveCSS("background-color", "rgb(1, 2, 3)");
  await page.getByRole("button", { name: "Theme", exact: true }).click();
  await expect(page.getByRole("button", { name: "Dark", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(next).toHaveCSS("background-color", "rgb(10, 10, 10)");
  await expect(page.getByRole("textbox", { name: "Background", exact: true })).toHaveValue("");
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });

  test("the header keeps its links on one row, clear of the playground's bar", async ({ page }) => {
    await page.goto("/play/#preset=github-callouts");
    const header = (await page.locator(".top").boundingBox())!;
    const end = (await page.locator(".top-end").boundingBox())!;
    expect(end.y + end.height).toBeLessThanOrEqual(header.y + header.height);
    // A trial click fails when another element would take the tap.
    for (const button of await page.locator(".play-bar button").all())
      await button.click({ trial: true, timeout: 2000 });
  });
});
