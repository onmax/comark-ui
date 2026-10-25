import { expect, test } from "@playwright/test";

test.use({ colorScheme: "light" });

test("the gallery shows every example in light and dark, and the filter narrows it", async ({
  page,
}) => {
  await page.goto("/play/gallery/");
  const item = page.locator("#tabs-tabs");
  const background = (scheme: string) =>
    item
      .locator(`.gallery-frame[data-scheme=${scheme}][data-ready]`)
      .evaluate((frame: HTMLIFrameElement) =>
        getComputedStyle(frame.contentDocument!.body).getPropertyValue("background-color"),
      );
  await item.scrollIntoViewIfNeeded();
  // The dark frame is dark though the system is light.
  await expect.poll(() => background("light")).toBe("rgb(255, 255, 255)");
  await expect.poll(() => background("dark")).not.toBe("rgb(255, 255, 255)");
  await expect(item.locator(".gallery-frame[data-scheme=dark]")).toBeVisible();

  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await expect(item.locator(".gallery-frame[data-scheme=light]")).toBeHidden();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);

  await page.locator(".sidebar").getByRole("searchbox", { name: "Filter components" }).fill("tabs");
  await expect(item).toBeVisible();
  await expect(page.locator("#annotate-before-after")).toBeHidden();
  await expect(page.locator('.sidebar [data-gallery="annotate-before-after"]')).toBeHidden();
});

test("the playground's column links to the gallery", async ({ page }) => {
  await page.goto("/play/");
  await page.locator(".sidebar").getByRole("link", { name: "Component gallery" }).click();
  await expect(page).toHaveURL(/\/play\/gallery\/$/);
  await expect(page.locator(".sidebar .pages a[aria-current=page]")).toHaveText(
    "Component gallery",
  );
});
