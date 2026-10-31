import { createHtmlRenderer } from "@comark/html";
import { expect, test } from "@playwright/test";
import details, { components } from "../packages/details/src/html.ts";

test("a details box closes faster than it opens, and its chevron moves with the content", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const render = createHtmlRenderer({ plugins: [details()], components });
  await page.setContent(await render('::details{summary="Why?"}\nBecause.\n::'));
  const timings = await page.locator(".cdt").evaluate(async (element) => {
    if (!(element instanceof HTMLDetailsElement)) throw new Error("Expected a details element");
    const chevron = element.querySelector(".cdt-summary");
    if (!chevron) throw new Error("Expected a summary");
    // Chromium leaves `::details-content` transitions out of `getAnimations()`, so read the durations it runs.
    const read = () => ({
      content: getComputedStyle(element, "::details-content").transitionDuration,
      chevron: getComputedStyle(chevron, "::after").transitionDuration,
      box: getComputedStyle(element).transitionDuration,
    });
    const closed = read();
    element.open = true;
    for (let frame = 0; frame < 2; frame++) await new Promise(requestAnimationFrame);
    const style = getComputedStyle(element, "::details-content");
    const midway = { height: Number.parseFloat(style.blockSize), opacity: Number(style.opacity) };
    return { closed, open: read(), midway };
  });
  // The content's durations are block-size, opacity, and content-visibility; the chevron's are rotate and translate.
  expect(timings.open).toEqual({
    content: "0.25s, 0.25s, 0.25s",
    chevron: "0.25s, 0.25s",
    box: "0.25s",
  });
  expect(timings.closed).toEqual({
    content: "0.18s, 0.12s, 0.18s",
    chevron: "0.18s, 0.18s",
    box: "0.18s",
  });
  expect(timings.midway.height).toBeGreaterThan(0);
  expect(timings.midway.opacity).toBeGreaterThan(0);
  expect(timings.midway.opacity).toBeLessThan(1);
});
