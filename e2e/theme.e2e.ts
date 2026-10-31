import { expect, test } from "@playwright/test";
import { mermaidCss } from "../packages/ui/src/client.ts";
import { theme } from "../packages/zoom/src/theme.ts";

for (const mode of ["light", "dark"] as const) {
  test(`status tokens follow a root .${mode} class over the OS color scheme`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: mode === "light" ? "dark" : "light" });
    await page.setContent(`<!doctype html><html class="${mode}"><head><style>
      ${mermaidCss}
      ${theme(".status-a,.status-b", "status", "shadow")}
      .error{color:var(--pele-error)}
      .critical{color:var(--pele-critical)}
      .status-a,.status-b{color:var(--_comark-danger);box-shadow:var(--_comark-shadow)}
    </style></head><body>
      <div class="pele-diagram"><span class="error">Error</span><span class="critical">Critical</span></div>
      <div class="status-a">First block</div><div class="status-b">Second block</div>
    </body></html>`);

    const danger = mode === "light" ? "rgb(238, 53, 51)" : "rgb(253, 115, 109)";
    for (const selector of [".error", ".critical", ".status-a", ".status-b"]) {
      await expect(page.locator(selector)).toHaveCSS("color", danger);
    }
    await expect(page.locator(".status-a")).toHaveCSS(
      "box-shadow",
      `rgba(0, 0, 0, ${mode === "light" ? "0.12" : "0.5"}) 0px 4px 12px 0px`,
    );

    await page.addStyleTag({ content: ":root{--comark-danger:rgb(1 2 3)}" });
    await expect(page.locator(".error")).toHaveCSS("color", "rgb(1, 2, 3)");
    await expect(page.locator(".status-b")).toHaveCSS("color", "rgb(1, 2, 3)");
  });
}

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
