import { createHtmlRenderer } from "@comark/html";
import { expect, type Locator, type Page, test } from "@playwright/test";
import comarkUi from "../packages/ui/src/html.ts";

// Press, copy, and ring through the motion layer that comark-ui's preset puts in every document.
const offline = { chips: { download: false }, badge: { download: false }, icon: { fetch: false } };

async function open(page: Page, markdown: string) {
  const { plugins, components } = comarkUi(offline);
  const html = await createHtmlRenderer({ plugins, components })(markdown);
  // On the test server's origin, a secure context, so the clipboard is there to grant.
  await page.goto("/no-such-page");
  await page.setContent(
    `<!doctype html><html><body style="width:36rem;margin:2rem">${html}</body></html>`,
  );
  await expect.poll(() => page.evaluate(() => !!window.__comarkMotion)).toBe(true);
}

const inlineScale = (locator: Locator) =>
  locator.evaluate((element) => {
    const scale = element.style.scale;
    return scale ? Number(scale.split(" ")[0]) : 1;
  });

// An icon-only button squashes its icon, as the layer does for every icon-only control, and keeps its own box still.
async function press(page: Page, button: Locator) {
  await page.evaluate(() => window.__comarkMotion?.setMotionSlowFactor(4));
  const icon = button.locator("svg");
  // No CSS press is left to compete with the spring.
  expect(
    await button.evaluate((element) => getComputedStyle(element).transitionProperty),
  ).not.toMatch(/\b(scale|all)\b/);
  await button.hover();
  await page.mouse.down();
  await expect(icon).toHaveCount(1);
  await expect.poll(() => inlineScale(icon)).toBeLessThan(1);
  expect(await inlineScale(button)).toBe(1);
  // Released off the button, so no click copies and swaps the icon under the test.
  await page.mouse.move(0, 0);
  await page.mouse.up();
  await expect
    .poll(() => icon.evaluate((element) => element.style.scale), { timeout: 8000 })
    .toBe("");
  await page.evaluate(() => window.__comarkMotion?.setMotionSlowFactor(1));
}

test("a code block's Copy button squashes its icon with the layer's spring and lets go on release", async ({
  page,
}) => {
  await open(page, "```ts\nconst a = 1\n```");
  await press(page, page.getByRole("button", { name: "Copy code" }));
});

test("a Mermaid diagram's Copy source button squashes its icon with the layer's spring", async ({
  page,
}) => {
  await open(page, "```mermaid\ngraph TD\n  A --> B\n```");
  const button = page.getByRole("button", { name: "Copy source" });
  await page.locator(".cmm").hover();
  await expect(page.locator(".cmm-bar")).toHaveCSS("opacity", "1");
  await press(page, button);
});

test("a successful code copy swaps the icon, rings once, and swaps back", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page, "```ts\nconst a = 1\n```");
  const button = page.getByRole("button", { name: "Copy code" });
  await button.click();
  await expect(page.getByRole("status")).toHaveText("Copied");
  // The ring is a box shadow that grows in the border color, written inline while it plays.
  await expect
    .poll(() => button.evaluate((element) => element.style.boxShadow))
    .toContain("color-mix");
  // The old icon blurs out while the check comes in, and then the button holds the check alone.
  await expect(button.locator(".ck-copy-done")).toBeVisible();
  await expect(button.locator("svg")).toHaveCount(1);
  await expect.poll(() => button.evaluate((element) => element.style.boxShadow)).toBe("");
  await expect(button.locator(".ck-copy-idle")).toBeVisible({ timeout: 4000 });
  await expect(button.locator("svg")).toHaveCount(1);
  // After the copy it presses the same way as before it.
  await press(page, button);
});

test("a table's Copy rings the split button around it", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page, "```csv\nday,pigeons\nMonday,3\n```");
  await page.getByRole("button", { name: "Copy table" }).click();
  await expect(page.getByRole("status")).toHaveText("Copied as table");
  await expect
    .poll(() => page.locator(".ctb-copy").evaluate((element) => element.style.boxShadow))
    .toContain("color-mix");
  await expect(page.locator(".ctb-copy-main svg")).toHaveCount(1);
});

test("under reduced motion a copy neither squashes nor rings, and the icon still changes", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page, "```ts\nconst a = 1\n```");
  await page.evaluate(() => window.__comarkMotion?.forceReducedMotion(true));
  const button = page.getByRole("button", { name: "Copy code" });
  await button.click();
  await expect(page.getByRole("status")).toHaveText("Copied");
  expect(await button.evaluate((element) => element.style.boxShadow)).toBe("");
  expect(await inlineScale(button)).toBe(1);
  await expect(button.locator(".ck-copy-done")).toBeVisible();
});
