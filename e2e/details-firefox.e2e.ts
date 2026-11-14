import { createHtmlRenderer } from "@comark/html";
import { expect, test } from "@playwright/test";
import details, { components } from "../packages/details/src/html.ts";

// Firefox has neither `interpolate-size` nor transitions on `::details-content`, so it takes the fallback: the
// content's children fade in. Text alone, which Comark leaves unwrapped, has no element to fade.
test.use({ browserName: "firefox" });

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`in Firefox, a details box's content ${reducedMotion === "reduce" ? "appears at once with reduced motion" : "fades in as it opens"}`, async ({
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
    if (reducedMotion === "reduce") expect(opacities).toEqual([1, 1, 1, 1]);
    else expect(opacities.some((opacity) => opacity > 0 && opacity < 1)).toBe(true);
  });
}
