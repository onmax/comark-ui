import { expect, test } from "@playwright/test";
import { gotoHydrated } from "./helpers.ts";

test("the GitHub HTML example keeps its explicit image width", async ({ page }) => {
  await gotoHydrated(page, "/github");
  await expect(
    page.locator('main img[alt="Office correlations: ducks vs. bugs, r = 0.94"]'),
  ).toHaveAttribute("width", "480");
});

test("no page scrolls sideways on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of [
    "/",
    "/guide/renderers",
    "/guide/theming",
    "/getting-started",
    "/annotate",
    "/charts",
    "/embed",
    "/github",
    "/lint/vite-doctor",
  ]) {
    await gotoHydrated(page, path);
    const [scroll, width] = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.clientWidth,
    ]);
    expect(scroll, path).toBeLessThanOrEqual(width);
  }
});
