import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { renderHtmlFromDocument } from "@comark/html";
import { parseMarkdown } from "comark";
import gitGraph, { components } from "../packages/git-graph/src/html.ts";

const fixture = (name: string) =>
  readFileSync(
    new URL(`../packages/git-graph/test/fixtures/${name}.txt`, import.meta.url),
    "utf8",
  ).trimEnd();
// A host's unlayered prose styles, as Drop's typeset has, which must not move a row off its dot.
const prose = `<style>
  body{margin:16px;font:17px/1.75 Georgia,serif}
  .prose :where(div, span, code, figure) { line-height:2; font-size:1.05em }
  .prose code { padding:2px 6px; background:#eee }
  .prose figure { margin:2em 0 }
</style>`;

test("every commit dot sits on its row's middle, at any width, in a host's prose, light and dark", async ({
  page,
}) => {
  for (const [name, props] of [
    ["backport", "{reverse}"],
    ["history", ""],
    ["stack", ""],
  ]) {
    const parsed = await parseMarkdown(
      `::git-graph${props}\n\`\`\`\n${fixture(name)}\n\`\`\`\n::`,
      { plugins: [gitGraph()] },
    );
    const html = await renderHtmlFromDocument(parsed, { components });
    for (const width of [360, 760]) {
      await page.setViewportSize({ width, height: 900 });
      for (const colorScheme of ["light", "dark"] as const) {
        await page.emulateMedia({ colorScheme });
        await page.setContent(`${prose}<main class="prose">${html}</main>`);
        const layout = await page.locator(".cgg").evaluate((figure) => {
          const middle = (element: Element) => {
            const box = element.getBoundingClientRect();
            return Math.round(box.top + box.height / 2);
          };
          return {
            rows: [...figure.querySelectorAll(".cgg-row")].map(middle).sort((a, b) => a - b),
            dots: [
              ...new Set([...figure.querySelectorAll(".cgg-commit, .cgg-merge")].map(middle)),
            ].sort((a, b) => a - b),
            overflow: document.documentElement.scrollWidth > innerWidth,
          };
        });
        for (const dot of layout.dots)
          expect(
            layout.rows.some((row) => Math.abs(row - dot) <= 1),
            `${name} ${width} ${colorScheme}`,
          ).toBe(true);
        expect(layout.overflow).toBe(false);
      }
    }
  }
});

test("a pick's colors keep their number readable in both schemes", async ({ page }) => {
  const parsed = await parseMarkdown(`::git-graph\n\`\`\`\n${fixture("backport")}\n\`\`\`\n::`, {
    plugins: [gitGraph()],
  });
  await page.setContent(await renderHtmlFromDocument(parsed, { components }));
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme });
    const fills = await page
      .locator(".cgg-pick")
      .evaluateAll((picks) =>
        picks.map((pick) => [
          getComputedStyle(pick.querySelector("circle")!).fill,
          getComputedStyle(pick.querySelector("text")!).fill,
        ]),
      );
    expect(fills.length).toBeGreaterThan(0);
    for (const [circle, text] of fills) expect(circle).not.toBe(text);
  }
});
