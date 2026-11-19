import { createHtmlRenderer } from "@comark/html";
import { expect, type Page, test } from "@playwright/test";
import comarkUi from "../packages/ui/src/html.ts";

const offline = { chips: { download: false }, badge: { download: false }, icon: { fetch: false } };

async function open(page: Page, markdown: string, options = {}) {
  const { plugins, components } = comarkUi({ ...offline, ...options });
  const html = await createHtmlRenderer({ plugins, components })(markdown);
  await page.goto("/no-such-page");
  await page.setContent(
    `<!doctype html><html><body style="width:36rem;margin:2rem">${html}</body></html>`,
  );
}

test("every document starts the motion layer once, and a pressed icon button squashes its icon with a spring", async ({
  page,
}) => {
  await open(page, "```ts\nconst a = 1\n```\n\n```ts\nconst b = 2\n```");
  expect(
    await page
      .locator("script")
      .evaluateAll(
        (scripts) =>
          scripts.filter((script) => script.textContent?.includes("vite-hub.motion.layer")).length,
      ),
  ).toBe(1);
  await page.evaluate(() => window.__comarkMotion?.setMotionSlowFactor(4));
  // Copy is icon-only with the layer: it holds the one icon it shows, so the press squashes that icon, as on Wrap.
  const button = page.getByRole("button", { name: "Copy code" }).first();
  const icon = button.locator("svg");
  await button.hover();
  await page.mouse.down();
  await expect(icon).toHaveCount(1);
  await expect
    .poll(() => icon.evaluate((element) => Number(element.style.scale.split(" ")[0] || 1)))
    .toBeLessThan(1);
  expect(await button.evaluate((element) => element.style.scale)).toBe("");
  await page.mouse.up();
  await expect
    .poll(() => icon.evaluate((element) => element.style.scale), { timeout: 8000 })
    .toBe("");
});

test("motion: false leaves the runtime out", async ({ page }) => {
  await open(page, "Some text.", { motion: false });
  expect(await page.evaluate(() => window.__comarkMotion)).toBeUndefined();
});

test("a zoomed copy button still swaps icons after the original has copied", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page, "::zoom\n```ts\nconst answer = 42\n```\n::");
  const original = page.getByRole("button", { name: "Copy code" });
  await original.click();
  await expect(original.locator(".ck-copy-done")).toBeAttached();
  await expect(original.locator(".ck-copy-done")).toHaveCount(0);
  expect(
    await original.locator(".ck-copy-idle").evaluate((icon: SVGElement) => icon.style.position),
  ).toBe("");
  await page.locator(".cz").press("Enter");
  const copy = page.locator(".cz-dialog").getByRole("button", { name: "Copy code" });
  await copy.click();
  await expect(copy.locator(".ck-copy-done")).toBeAttached();
  await expect(copy.locator(".ck-copy-done")).toHaveCount(0);
  expect(
    await copy.locator(".ck-copy-idle").evaluate((icon: SVGElement) => icon.style.position),
  ).toBe("");
});

test("the first click on a zoomed table's Copy button copies and swaps its icon", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page, "::zoom\n:::table\n```csv\nBird,Seen\nPigeon,2\n```\n:::\n::");
  const original = page.getByRole("button", { name: "Copy table" });
  await original.click();
  await expect(original).toHaveAttribute("data-state", "done");
  await expect(original).not.toHaveAttribute("data-state", "done");
  await expect(original.locator("svg")).toHaveCount(1);
  await page.evaluate(() => navigator.clipboard.writeText("before zoomed copy"));

  await page.locator(".cz").press("Enter");
  const dialog = page.locator(".cz-dialog");
  const copy = dialog.getByRole("button", { name: "Copy table" });
  const icon = copy.locator("svg");
  const idle = await icon.innerHTML();
  await copy.click();
  await expect(dialog.locator(".ctb-status")).toHaveText("Copied as table");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("Bird\tSeen\nPigeon\t2");
  await expect(icon).toHaveCount(1);
  expect(await icon.innerHTML()).not.toBe(idle);
  await expect(copy).not.toHaveAttribute("data-state", "done");
  await expect(icon).toHaveCount(1);
  expect(await icon.innerHTML()).toBe(idle);
});
