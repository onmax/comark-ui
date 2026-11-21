import { createHtmlRenderer } from "@comark/html";
import { expect, test } from "@playwright/test";
import comarkUi from "../packages/ui/src/html.ts";
import { fixture } from "./helpers.ts";

const render = createHtmlRenderer(
  comarkUi({
    chips: { download: false },
    badge: { download: false },
    icon: { fetch: false },
    diagrams: { draw: false },
  }),
);

test("the first block adds no space above, with the typeset styles before it", async ({ page }) => {
  const html = await render("## Plan\n\nThe first step.");
  expect(html.trimStart()).toMatch(/^<style data-comark-typeset>/);
  await page.setContent(`<!doctype html><main style="width:40rem">${html}</main>`);
  await expect(page.getByRole("heading", { name: "Plan" })).toHaveCSS("margin-top", "0px");
  await expect(page.getByText("The first step.")).not.toHaveCSS("margin-top", "0px");
});

test("a tall image fits on the screen, centered over its caption, while a screenshot keeps its size", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const tall = (name: string) =>
    page.route(`**/${name}.svg`, (route) =>
      route.fulfill({
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="1000"><rect width="400" height="1000"/></svg>',
      }),
    );
  await tall("painting");
  await tall("shot");
  const html = await render(
    '![A tall painting](/painting.svg "A tall painting")\n\n::screenshot{src="/shot.svg" alt="A tall screenshot"}\n::',
  );
  await fixture(page, html, "main{width:40rem;margin:auto}");
  const painting = page.locator('figure > img[alt="A tall painting"]');
  await expect(painting).toHaveJSProperty("complete", true);
  const box = (await painting.boundingBox())!;
  const column = (await page.locator("main").boundingBox())!;
  // 70% of the 800px window, at the picture's own 2:5.
  expect(box.height).toBeCloseTo(560, 0);
  expect(box.width).toBeCloseTo(224, 0);
  expect(box.x - column.x).toBeCloseTo((column.width - box.width) / 2, 0);
  // The screenshot's marks sit on its image, so the image keeps the column's width and its full height.
  const shot = page.locator('img[alt="A tall screenshot"]');
  await expect(shot).toHaveJSProperty("complete", true);
  expect((await shot.boundingBox())!.height).toBeCloseTo(column.width * 2.5, 0);
});
