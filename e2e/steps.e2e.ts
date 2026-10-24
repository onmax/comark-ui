import { expect, test } from "@playwright/test";

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
