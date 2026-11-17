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
  await page.evaluate((json) => {
    const app = window as unknown as {
      fixture: { mountDocument: (document: unknown) => (next: unknown) => void };
      update: (next: unknown) => void;
    };
    app.update = app.fixture.mountDocument(JSON.parse(json));
  }, JSON.stringify(value));
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

  // A formula that didn't typeset becomes one that does, in the same component, as while someone fixes their TeX.
  const fixed = await parseMarkdown(markdown.replace("\\frac{a}$", "\\frac{a}{c}$"), {
    plugins: [math()],
  });
  await page.evaluate(
    (json) => (window as unknown as { update: (next: unknown) => void }).update(JSON.parse(json)),
    JSON.stringify(fixed),
  );
  await expect(page.locator(".cmh-source")).toHaveCount(0);
  const updated = await page.evaluate(() =>
    [...document.querySelectorAll(".cmh")].map(
      (formula) =>
        [...formula.querySelectorAll("math")].find((math) => math.getBoundingClientRect().width > 0)
          ?.namespaceURI,
    ),
  );
  expect(updated).toEqual([MATHML, MATHML, MATHML]);

  // A formula that goes to TeX and comes back shows its new MathML, not the copy of the one before.
  const update = (source: string) =>
    parseMarkdown(source, { plugins: [math()] }).then((next) =>
      page.evaluate(
        (json) =>
          (window as unknown as { update: (next: unknown) => void }).update(JSON.parse(json)),
        JSON.stringify(next),
      ),
    );
  await update("$a$");
  await update("$\\frac{a}$");
  await expect(page.locator(".cmh-source")).toHaveCount(1);
  await update("$b$");
  await expect(page.locator(".cmh")).toHaveCount(1);
  const last = await page
    .locator(".cmh")
    .evaluate((formula) =>
      [...formula.querySelectorAll("math")]
        .filter((math) => math.getBoundingClientRect().width > 0)
        .map((math) => [math.namespaceURI, math.querySelector("mi")?.textContent]),
    );
  expect(last).toEqual([[MATHML, "b"]]);
});
