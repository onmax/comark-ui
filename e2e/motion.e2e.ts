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
