import { createHtmlRenderer } from "@comark/html";
import { expect, test } from "@playwright/test";
import chips, { components } from "../packages/chips/dist/html.mjs";

const href = `https://example.com/reviews/${"abcdefghij".repeat(9)}`;
const label = "A detailed review of the build configuration and deployment settings "
  .repeat(3)
  .trim();
const token = "abcdefghij".repeat(9);
const render = createHtmlRenderer({ plugins: [chips({ download: false })], components });

for (const width of [320, 390, 900, 1280]) {
  test(`long chips fit a ${width}px document`, async ({ page }) => {
    const html = await render(
      `<${href}>\n\n[${label}](${href})\n\n[${token}](${href})\n\n[**${token}**](${href})\n\n[${token}](https://github.com/onmax)`,
    );
    await page.setViewportSize({ width, height: 900 });
    await page.route("https://**/*", (route) => route.abort());
    await page.setContent(
      `<!doctype html><style>body{margin:0;font:16px/1.6 system-ui}main{max-width:645px;padding:16px}p{margin:0 0 16px}</style><main>${html}</main>`,
    );
    await expect(page.locator(".cp")).toHaveText([
      href.replace("https://", ""),
      label,
      token,
      token,
      token,
    ]);
    expect(
      await page
        .locator(".cp")
        .evaluateAll((links) => links.map((link) => link.getAttribute("href"))),
    ).toEqual([href, href, href, href, "https://github.com/onmax"]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  });
}
