import { createHtmlRenderer } from "@comark/html";
import { expect, test } from "@playwright/test";
import details, { components } from "../packages/details/src/html.ts";

test.use({ browserName: "firefox" });

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`in Firefox, a details box's content appears at once (${reducedMotion})`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion });
    const render = createHtmlRenderer({ plugins: [details()], components });
    await page.setContent(await render('::details{summary="Why?"}\nBecause.\n\nAnd that.\n::'));
    const opacities = await page.locator(".cdt").evaluate(async (element) => {
      if (!(element instanceof HTMLDetailsElement)) throw new Error("Expected a details element");
      const content = element.querySelector(".cdt > :not(summary)");
      if (!content) throw new Error("Expected content");
      element.open = true;
      const seen: number[] = [];
      for (let frame = 0; frame < 4; frame++) {
        await new Promise(requestAnimationFrame);
        seen.push(Number(getComputedStyle(content).opacity));
      }
      return seen;
    });
    expect(opacities).toEqual([1, 1, 1, 1]);
  });
}
