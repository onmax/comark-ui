import { createHtmlRenderer } from "@comark/html";
import { expect, type Page, test } from "@playwright/test";
import comarkUi from "../packages/ui/src/html.ts";

const offline = { chips: { download: false }, badge: { download: false }, icon: { fetch: false } };

async function open(page: Page, markdown: string) {
  const { plugins, components } = comarkUi(offline);
  const html = await createHtmlRenderer({ plugins, components })(markdown);
  await page.goto("/no-such-page");
  await page.setContent(
    `<!doctype html><html><body style="width:46rem;margin:2rem auto">${html}</body></html>`,
  );
  await page.waitForFunction(() => window.__comarkMotion);
}

const screenshot = `::screenshot{src="/before.png" alt="Filter toolbar wrapping onto a second row" viewport="640x250"}
::::annotation{x=22.4 y=50.4 w=13.3 h=20.6 mark="circle" color="red"}
**Apply** sits 6px lower than the chips.
::::
::`;

test("a screenshot's Copy button rings once when the copy lands on the clipboard", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page, screenshot);
  const figure = page.locator(".ca-screenshot").first();
  await figure.hover();
  await expect(figure.locator(".ca-overlay")).toHaveAttribute("src", /^blob:/);
  const copy = figure.locator(".ca-copy");
  await copy.click();
  await expect(figure.locator(".ca-copy-status")).toHaveText("Copied");
  await expect
    .poll(() => copy.evaluate((node: HTMLElement) => node.style.boxShadow))
    .toMatch(/^0(?:px)? 0(?:px)? 0(?:px)? [\d.]+px/);
  await expect
    .poll(() => copy.evaluate((node: HTMLElement) => node.style.boxShadow), { timeout: 5000 })
    .toBe("");
});

test("under reduced motion a copy does not ring", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page, screenshot);
  await page.evaluate(() => window.__comarkMotion!.forceReducedMotion(true));
  const figure = page.locator(".ca-screenshot").first();
  await figure.hover();
  await expect(figure.locator(".ca-overlay")).toHaveAttribute("src", /^blob:/);
  const copy = figure.locator(".ca-copy");
  await copy.click();
  await expect(figure.locator(".ca-copy-status")).toHaveText("Copied");
  expect(await copy.evaluate((node: HTMLElement) => node.style.boxShadow)).toBe("");
});
