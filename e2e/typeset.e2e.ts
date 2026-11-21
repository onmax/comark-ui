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
    figure: { unwrap: true },
  }),
);

const portrait =
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="1000"><rect width="400" height="1000"/></svg>';

test("the first block adds no space above, with the typeset styles before it", async ({ page }) => {
  const html = await render("## Plan\n\nThe first step.");
  expect(html.trimStart()).toMatch(/^<style data-comark-typeset>/);
  await page.setContent(`<!doctype html><main style="width:40rem">${html}</main>`);
  await expect(page.getByRole("heading", { name: "Plan" })).toHaveCSS("margin-top", "0px");
  await expect(page.getByText("The first step.")).not.toHaveCSS("margin-top", "0px");
});

for (const typedAttr of [true, false]) {
  test(`a tall image fits over its caption without capping a screenshot (${typedAttr ? "native CSS" : "without typed attr"})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const paintingReady = Promise.withResolvers<void>();
    await page.route("**/painting.svg", async (route) => {
      await paintingReady.promise;
      await route.fulfill({ contentType: "image/svg+xml", body: portrait });
    });
    await page.route("**/shot.svg", (route) =>
      route.fulfill({ contentType: "image/svg+xml", body: portrait }),
    );
    await page.route("**/landscape.svg", (route) =>
      route.fulfill({
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250"></svg>',
      }),
    );
    let html = await render(
      '![A tall painting](/painting.svg "A tall painting"){width="400" height="1000"}\n\n' +
        '![A half-width painting](/landscape.svg){width="50%" height="250"}\n\n' +
        '::screenshot{src="/shot.svg" alt="A tall screenshot"}\n::',
    );
    if (typedAttr) {
      const dimensions = ' style="--_ty-image-w:400;--_ty-image-h:1000"';
      expect(html).toContain(dimensions);
      html = html.replace(dimensions, "");
    } else {
      const query = "@supports(opacity:attr(width type(<number>)))";
      expect(html).toContain(query);
      html = html.replace(query, "@supports (width: unsupported)");
    }
    const painting = page.locator('figure > img[alt="A tall painting"]');
    await Promise.all([
      fixture(page, html, "main{width:40rem;margin:auto}"),
      (async () => {
        try {
          await expect(painting).toHaveAttribute("width", "400");
          await expect(painting).toHaveAttribute("height", "1000");
          await expect(painting).toHaveJSProperty("naturalWidth", 0);
          await expect(painting).toHaveCSS("width", "224px");
          await expect(painting).toHaveCSS("height", "560px");
        } finally {
          paintingReady.resolve();
        }
      })(),
    ]);
    await expect(painting).toHaveJSProperty("naturalWidth", 400);
    const box = (await painting.boundingBox())!;
    const column = (await page.locator("main").boundingBox())!;
    // 70% of the 800px window, at the picture's own 2:5.
    expect(box.height).toBeCloseTo(560, 0);
    expect(box.width).toBeCloseTo(224, 0);
    expect(box.x - column.x).toBeCloseTo((column.width - box.width) / 2, 0);
    const halfWidth = page.getByRole("img", { name: "A half-width painting" });
    await expect(halfWidth).toHaveAttribute("width", "50%");
    await expect(halfWidth).toHaveJSProperty("naturalWidth", 400);
    await expect(halfWidth).toHaveCSS("width", "320px");
    // The screenshot's marks sit on its image, so the image keeps the column's width and its full height.
    const shot = page.locator('img[alt="A tall screenshot"]');
    await expect(shot).toHaveJSProperty("complete", true);
    expect((await shot.boundingBox())!.height).toBeCloseTo(column.width * 2.5, 0);
  });
}

test("ordinary Markdown images fit inside links, inline markup, tables, and the comments wrapper", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.route("**/portrait.svg", (route) =>
    route.fulfill({ contentType: "image/svg+xml", body: portrait }),
  );
  const html = await render(`> [![Quote](/portrait.svg)](/full)

Portrait
: [![Definition](/portrait.svg)](/full)

**![Emphasis](/portrait.svg)**

| Portrait |
| --- |
| ![Cell](/portrait.svg) |

![Unwrapped](/portrait.svg)

:comment[Margin comment]{note="A note"}`);
  await fixture(page, html, "main{width:40rem;margin:auto}");
  for (const selector of [
    'blockquote > a > img[alt="Quote"]',
    'dd > a > img[alt="Definition"]',
    'strong > img[alt="Emphasis"]',
    'td > img[alt="Cell"]',
    '.cr > img[alt="Unwrapped"]',
  ]) {
    const image = page.locator(selector);
    await expect(image).toHaveJSProperty("naturalWidth", 400);
    await expect(image).toHaveCSS("max-height", "560px");
    expect((await image.boundingBox())!.height).toBeLessThanOrEqual(560);
  }
});
