import { expect, test } from "@playwright/test";

const next = (page: import("@playwright/test").Page) =>
  page.locator("main .cc").first().getByRole("button", { name: "Next slide" });

test("the controls default to shadcn's neutral theme, light and dark", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/carousel/");
  await expect(next(page)).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(next(page)).toHaveCSS("border-top-color", "rgb(229, 229, 229)");

  await page.emulateMedia({ colorScheme: "dark" });
  await expect(next(page)).toHaveCSS("background-color", "rgb(10, 10, 10)");
});

test("a shadcn theme set on any ancestor applies, and `--comark-*` wins over it", async ({
  page,
}) => {
  // The OS is light while the page is dark, as with shadcn's `.dark` class.
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/carousel/");
  await page.addStyleTag({ content: "main{--background:rgb(1 2 3);--border:rgb(4 5 6)}" });
  await expect(next(page)).toHaveCSS("background-color", "rgb(1, 2, 3)");
  await expect(next(page)).toHaveCSS("border-top-color", "rgb(4, 5, 6)");

  await page.addStyleTag({ content: ":root{--comark-background:rgb(7 8 9)}" });
  await expect(next(page)).toHaveCSS("background-color", "rgb(7, 8, 9)");
});

test("a host's plain rule beats the plugin's own, and the zoomed view shares the tokens", async ({
  page,
}) => {
  await page.goto("/carousel/");
  await page.addStyleTag({
    content: ".cc-step{border-radius:0}:root{--comark-muted:rgb(10 20 30)}",
  });
  await expect(next(page)).toHaveCSS("border-top-left-radius", "0px");

  await page.locator("main .cc").first().locator(".cc-slide").first().click();
  await expect(page.locator(".cz-count")).toHaveCSS("color", "rgb(10, 20, 30)");
});

test("tokens set on .cz-dialog theme only the zoomed view", async ({ page }) => {
  await page.goto("/carousel/");
  await page.addStyleTag({ content: ".cz-dialog{--comark-muted:rgb(10 20 30)}" });
  const count = page.locator("main .cc").first().locator(".cc-count");
  const color = await count.evaluate((node) => getComputedStyle(node).color);

  await page.locator("main .cc").first().locator(".cc-slide").first().click();
  await expect(page.locator(".cz-count")).toHaveCSS("color", "rgb(10, 20, 30)");
  await expect(count).toHaveCSS("color", color);
  expect(color).not.toBe("rgb(10, 20, 30)");
});
