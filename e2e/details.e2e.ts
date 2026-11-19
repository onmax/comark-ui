import { createHtmlRenderer } from "@comark/html";
import { expect, test } from "@playwright/test";
import details, { components } from "../packages/details/src/html.ts";

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`a details box opens at once and its chevron has no transition (${reducedMotion})`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion });
    const render = createHtmlRenderer({ plugins: [details()], components });
    await page.setContent(await render('::details{summary="Why?"}\nBecause.\n\nAnd that.\n::'));
    const seen = await page.locator(".cdt").evaluate(async (element) => {
      if (!(element instanceof HTMLDetailsElement)) throw new Error("Expected a details element");
      const chevron = element.querySelector(".cdt-summary>.cdt-chevron");
      const content = element.querySelector(".cdt>p");
      if (!chevron || !content) throw new Error("Expected a chevron and content");
      const read = () => ({
        transitions: [
          getComputedStyle(element).transitionDuration,
          getComputedStyle(element, "::details-content").transitionDuration,
          getComputedStyle(chevron).transitionDuration,
        ],
        rotate: getComputedStyle(chevron).rotate,
        opacity: Number(getComputedStyle(content).opacity),
        height: content.getBoundingClientRect().height,
      });
      const closed = read();
      element.open = true;
      const open = read();
      await new Promise(requestAnimationFrame);
      return { closed, open, frame: read() };
    });
    expect(seen.closed.transitions).toEqual(["0s", "0s", "0s"]);
    expect(seen.closed.rotate).toBe("45deg");
    expect(seen.open.rotate).toBe("225deg");
    expect(seen.open.transitions).toEqual(["0s", "0s", "0s"]);
    expect(seen.frame.opacity).toBe(1);
    expect(seen.frame.height).toBeGreaterThan(0);
    expect(seen.frame.height).toBe(seen.open.height);
  });
}

test("a details chevron stays in place as it points down and up", async ({ page }) => {
  const render = createHtmlRenderer({ plugins: [details()], components });
  await page.setContent(await render('::details{summary="Why?"}\nBecause.\n::'));
  const centers = await page.locator(".cdt").evaluate((element) => {
    if (!(element instanceof HTMLDetailsElement)) throw new Error("Expected a details element");
    const chevron = element.querySelector(".cdt-chevron")!;
    const summary = element.querySelector(".cdt-summary")!.getBoundingClientRect();
    const center = () => {
      const box = chevron.getBoundingClientRect();
      return {
        x: box.x + box.width / 2,
        y: box.y + box.height / 2 - (summary.y + summary.height / 2),
      };
    };
    const closed = center();
    element.open = true;
    return { closed, open: center() };
  });
  // Pointing down it sits 2px above the middle of the summary, and pointing up 2px below, as an arrowhead looks centered.
  expect(centers.closed.y).toBeCloseTo(-2, 0);
  expect(centers.open.y).toBeCloseTo(2, 0);
  expect(centers.open.x).toBeCloseTo(centers.closed.x, 0);
});
