import { expect, type Page, test } from "@playwright/test";

// Every console error and page error, so each test can assert there were none.
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

const pages = [
  { path: "/zoom", selector: "img[data-zoom], .cz" },
  { path: "/tabs", selector: ".ct .ct-tab" },
  { path: "/carousel", selector: ".cc-track" },
  { path: "/charts", selector: ".cch .cch-plot svg" },
  { path: "/charts/notes", selector: ".cch .cch-plot svg" },
  { path: "/github", selector: ".cgc[data-type]" },
];

for (const { path, selector } of pages)
  test(`${path} renders the plugin output with no console errors`, async ({ page }) => {
    const errors = watchErrors(page);
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator(selector).first()).toBeAttached();
    // Hydration finished, so a mismatch or a failed script would have logged by now.
    await page.waitForLoadState("networkidle");
    expect(errors).toEqual([]);
  });

async function zoomOpens(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.locator(".docs-example-preview img[data-zoom]").first().click();
  await expect(page.locator(".cz-dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".cz-dialog")).toHaveCount(0);
}

async function tabSwitches(page: Page) {
  await page.waitForLoadState("networkidle");
  const tabs = page.locator(".docs-example-preview .ct").first().locator(".ct-tab");
  await tabs.nth(1).click();
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "false");
}

test("an example switches between its preview and Markdown source", async ({ page }) => {
  await page.goto("/zoom");
  await page.waitForLoadState("networkidle");
  const example = page.locator(".docs-example").first();
  const preview = example.locator(".docs-example-preview");
  const source = example.locator("pre");
  const previewButton = example.getByRole("button", { name: "Preview", exact: true });
  const codeButton = example.getByRole("button", { name: "Code", exact: true });

  await expect(previewButton).toBeVisible();
  await expect(codeButton).toBeVisible();
  await expect(preview).toBeVisible();
  await expect(source).toBeHidden();
  await codeButton.click();
  await expect(source).toBeVisible();
  await expect(source).toContainText("![Office correlations dashboard]");
  await expect(preview).toBeHidden();
  await expect(codeButton).toHaveAttribute("aria-pressed", "true");
  await previewButton.click();
  await expect(preview).toBeVisible();
  await expect(source).toBeHidden();
  await expect(previewButton).toHaveAttribute("aria-pressed", "true");
});

test("a click on an image opens the zoom dialog", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/zoom");
  await zoomOpens(page);
  expect(errors).toEqual([]);
});

test("a tab switches", async ({ page }) => {
  await page.goto("/tabs");
  await tabSwitches(page);
});

test("the carousel steps to the next slide", async ({ page }) => {
  await page.goto("/carousel");
  const carousel = page.locator(".docs-example-preview [aria-roledescription=carousel]").first();
  await expect(carousel.locator(".cc-count")).toHaveText(/^1 \//);
  await carousel.getByRole("button", { name: "Next slide" }).click();
  await expect(carousel.locator(".cc-count")).toHaveText(/^2 \//);
});

test("scripts keep working across client-side navigation", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/zoom");
  await page.waitForLoadState("networkidle");
  // A full page load would drop this marker.
  await page.evaluate(() => ((window as { __spa?: boolean }).__spa = true));
  await page.locator("a[href='/tabs']").first().click();
  await expect(page).toHaveURL(/\/tabs$/);
  await expect(page.locator(".docs-example-preview .ct").first()).toBeVisible();
  await tabSwitches(page);
  await page.locator("a[href='/zoom']").first().click();
  await expect(page).toHaveURL(/\/zoom$/);
  await zoomOpens(page);
  expect(await page.evaluate(() => (window as { __spa?: boolean }).__spa)).toBe(true);
  expect(errors).toEqual([]);
});

test("HTML-only runtimes start on first client navigation and after returning", async ({
  page,
}) => {
  const errors = watchErrors(page);
  await page.goto("/zoom");
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => ((window as { __spa?: boolean }).__spa = true));

  await page.locator("a[href='/quiz']").first().click();
  await expect(page).toHaveURL(/\/quiz$/);
  const question = page.locator(".docs-example-preview .cqz[data-quiz-kind='question']").first();
  await expect(question).toHaveAttribute("data-upgraded", "");
  await question.locator(".cqz-option[data-correct] .cqz-choice").click();
  await question.getByRole("button", { name: "Check", exact: true }).click();
  await expect(question).toHaveAttribute("data-state", "correct");

  await page.locator("a[href='/annotate']").first().click();
  await expect(page).toHaveURL(/\/annotate$/);
  await page.getByRole("tab", { name: "Before / after slider", exact: true }).click();
  const handle = page.locator(".docs-example-preview .ca-swipe:visible .ca-handle").first();
  await expect(page.locator("html")).toHaveAttribute("data-annotate-ready", "");
  await expect(handle).toHaveAttribute("aria-valuenow", "50");
  await handle.focus();
  await page.keyboard.press("ArrowRight");
  await expect(handle).toHaveAttribute("aria-valuenow", "55");

  await page.locator("a[href='/quiz']").first().click();
  await expect(page).toHaveURL(/\/quiz$/);
  await expect(question).toHaveAttribute("data-upgraded", "");
  await expect(question).toHaveAttribute("data-state", "correct");
  expect(await page.evaluate(() => (window as { __spa?: boolean }).__spa)).toBe(true);
  expect(errors).toEqual([]);
});

test("search finds a page", async ({ page }) => {
  await page.goto("/zoom");
  await page.waitForLoadState("networkidle");
  await page.keyboard.press("ControlOrMeta+k");
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Search" }).fill("sankey");
  // The index loads on first open; the Sankey heading of the charts page must come back.
  await expect(
    dialog
      .getByRole("option")
      .filter({ hasText: /Sankey/ })
      .first(),
  ).toBeVisible();
});

test("the raw Markdown copy and llms.txt are served", async ({ request }) => {
  const raw = await request.get("/raw/zoom.md");
  expect(raw.status()).toBe(200);
  expect(raw.headers()["content-type"]).toContain("text/markdown");
  expect(await raw.text()).toContain("::zoom");
  const llms = await request.get("/llms.txt");
  expect(llms.status()).toBe(200);
  expect(await llms.text()).toMatch(/\/raw\/tabs\.md|\/tabs/);
});
