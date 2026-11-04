import { createHtmlRenderer } from "@comark/html";
import { expect, test } from "@playwright/test";
import badge, { components } from "../packages/badge/src/html.ts";

const render = createHtmlRenderer({ plugins: [badge()], components });

test("renders document badge images at their preset heights", async ({ page }) => {
  await page.setContent(
    await render(
      [
        ':badge[v1.2.3]{label="npm" preset="npmx" icon="npmx"}',
        ':badge[v1.2.3]{label="npm" preset="nuxt" icon="nuxt"}',
        ':badge[v1.2.3]{label="npm" preset="flat" icon="npm"}',
        ':badge[v1.2.3]{label="npm" preset="for-the-badge" icon="npm"}',
      ].join("\n"),
    ),
  );
  await expect
    .poll(() =>
      page.locator(".cb-image").evaluateAll((images) =>
        images.map((image) => ({
          natural: image instanceof HTMLImageElement ? image.naturalHeight : 0,
          rendered: Math.round(image.getBoundingClientRect().height),
        })),
      ),
    )
    .toEqual(
      expect.arrayContaining([
        { natural: 20, rendered: 20 },
        { natural: 26, rendered: 26 },
        { natural: 28, rendered: 28 },
      ]),
    );
});
