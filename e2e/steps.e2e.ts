import { expect, test } from "@playwright/test";
import { createHtmlRenderer } from "@comark/html";
import { anchors, components as linksComponents } from "../packages/links/src/html.ts";
import stepsPlugin, { components as stepsComponents } from "../packages/steps/src/html.ts";
import { typesetCss } from "../packages/ui/src/typeset-css.ts";

for (const width of [360, 1280]) {
  for (const linked of [false, true]) {
    test(`step numbers align with ${linked ? "linked" : "plain"} headings at ${width}px`, async ({
      page,
    }) => {
      const render = createHtmlRenderer({
        plugins: [stepsPlugin(), ...(linked ? [anchors()] : [])],
        components: { ...stepsComponents, ...(linked ? linksComponents : {}) },
      });
      const html = await render(
        "::steps\n### 2022 to 2024: a changed file recompiled nothing\nTemplates were recompiled only when a file was added or removed.\n\n### November 2024: a changed file recompiled everything\nThe generated types went stale when you renamed a plugin.\n::",
      );
      await page.setViewportSize({ width, height: 700 });
      await page.setContent(`<main><style>${typesetCss}</style>${html}</main>`);
      const measurements = await page.locator(".cs-step").evaluateAll((items) =>
        items.map((item) => {
          const heading = item.querySelector("h3")!;
          const body = item.querySelector("p")!;
          const box = item.getBoundingClientRect();
          const title = heading.getBoundingClientRect();
          const headingRow = heading.closest(".cl-heading") ?? heading;
          const number = getComputedStyle(item, "::before");
          return {
            top: box.top,
            bottom: box.bottom,
            headingTop: title.top,
            headingHeight: title.height,
            firstLineHeight: Number.parseFloat(getComputedStyle(heading).lineHeight),
            numberHeight: Number.parseFloat(number.height),
            numberTop: box.top + Number.parseFloat(number.top),
            bodyGap: body.getBoundingClientRect().top - headingRow.getBoundingClientRect().bottom,
          };
        }),
      );
      expect(measurements).toHaveLength(2);
      for (const item of measurements) {
        expect(item.headingTop).toBe(item.numberTop);
        expect(item.firstLineHeight).toBe(item.numberHeight);
        expect(item.bodyGap).toBe(8);
        if (width === 360) expect(item.headingHeight).toBeGreaterThan(item.firstLineHeight);
      }
      expect(measurements[1]!.top).toBe(measurements[0]!.bottom);
      if (linked) {
        await expect(
          page.getByRole("link", {
            name: 'Section titled "2022 to 2024: a changed file recompiled nothing"',
          }),
        ).toHaveAttribute("href", "#_2022-to-2024-a-changed-file-recompiled-nothing");
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    });
  }
}

test("the line reaches the next number although the page's headings have a top margin", async ({
  page,
}) => {
  await page.goto("/steps/");
  const steps = page.locator(".cs").first().locator(".cs-step");
  await expect(steps.first().locator("h3")).toHaveCSS("margin-top", "0px");
  const boxes = await steps.evaluateAll((items) =>
    items.map((item) => {
      const box = item.getBoundingClientRect();
      return { top: box.top, bottom: box.bottom };
    }),
  );
  expect(boxes.length).toBeGreaterThan(1);
  for (const [at, box] of boxes.slice(1).entries()) expect(box.top).toBe(boxes[at]!.bottom);
});
