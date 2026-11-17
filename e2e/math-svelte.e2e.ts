import { expect, test } from "@playwright/test";
import { parseMarkdown } from "comark";
import math from "../packages/math/src/index.ts";
import { svelteBundle } from "../packages/math/test/svelte-bundle.ts";

const MATHML = "http://www.w3.org/1998/Math/MathML";
const markdown = "Mass $\\frac{a}{b}$, and a broken $\\frac{a}$.\n\n$$\n\\sum_i i\n$$\n";

let bundle: string;
test.beforeAll(async () => {
  bundle = await svelteBundle("./fixtures/svelte-client.ts", "client");
});

// @comark/svelte creates elements in the browser with <svelte:element>, which gives MathML's tags the HTML
// namespace; a server render doesn't show it, since the page's parser makes them MathML.
test("@comark/svelte gives formulas made in the browser MathML's namespace", async ({ page }) => {
  const value = await parseMarkdown(markdown, { plugins: [math()] });
  await page.setContent("<!doctype html><meta charset=utf-8><body></body>");
  await page.addScriptTag({ content: bundle });
  // The document goes as JSON, the form a page receives it in.
  await page.evaluate(
    (json) =>
      (
        window as unknown as { fixture: { mountDocument: (document: unknown) => void } }
      ).fixture.mountDocument(JSON.parse(json)),
    JSON.stringify(value),
  );
  await expect(page.locator(".cmh")).toHaveCount(3);
  const shown = await page.evaluate(() =>
    [...document.querySelectorAll(".cmh")].map((formula) => {
      const visible = [...formula.querySelectorAll("math")].filter(
        (math) => math.getBoundingClientRect().width > 0,
      );
      return {
        source: formula.classList.contains("cmh-source") ? formula.textContent : null,
        namespaces: visible.map((math) => [
          math.namespaceURI,
          math.querySelector("mi, mn, mo")?.namespaceURI,
        ]),
      };
    }),
  );
  expect(shown).toEqual([
    { source: null, namespaces: [[MATHML, MATHML]] },
    { source: "\\frac{a}", namespaces: [] },
    { source: null, namespaces: [[MATHML, MATHML]] },
  ]);
});
