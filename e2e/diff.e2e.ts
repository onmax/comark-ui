import { expect, test } from "@playwright/test";
import { renderHtmlFromDocument } from "@comark/html";
import { parseMarkdown } from "comark";
import diffPlugin, { components } from "../packages/diff/src/html.ts";

const file = "app/components/OrderSuggestions/Table.vue";
const change = (
  line = "",
  value = "8",
) => `::diff{file="${file}" label="Edit columns behind editMode" ${line}}
\`\`\`ts
const quantity = 4;
\`\`\`
\`\`\`ts
const quantity = ${value};
\`\`\`
::`;

// Prose hosts such as Drop use an unlayered typeset stylesheet with this opt-out.
const prose = `<style>
  body{margin:16px}
  .prose :where(table, td, del, figcaption):not(:where([data-not-typeset], [data-not-typeset] *)) { font:16px/1.5 serif }
  .prose :where(table):not(:where([data-not-typeset], [data-not-typeset] *)) { display:block;width:max-content;max-width:100%;overflow-x:auto }
  .prose :where(td):not(:where([data-not-typeset], [data-not-typeset] *)) { padding:12px 16px;border-top:1px solid }
  .prose :where(del):not(:where([data-not-typeset], [data-not-typeset] *)) { text-decoration:line-through }
</style>`;

test("diff rows fill the card inside prose, with or without line numbers", async ({ page }) => {
  for (const width of [360, 960]) {
    await page.setViewportSize({ width, height: 600 });
    for (const colorScheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme });
      for (const line of ["", "line=212"]) {
        const parsed = await parseMarkdown(change(line), { plugins: [diffPlugin()] });
        const html = await renderHtmlFromDocument(parsed, { components });
        await page.setContent(`${prose}<main class="prose">${html}</main>`);
        const dimensions = await page.locator(".cd").evaluate((figure) => {
          const scroll = figure.querySelector(".cd-scroll")!;
          const row = figure.querySelector(".cd-add")!;
          const cell = row.querySelector(".cd-line")!;
          return {
            scroll: scroll.clientWidth,
            row: row.getBoundingClientRect().width,
            padding: getComputedStyle(cell).paddingTop,
            decoration: getComputedStyle(figure.querySelector("del")!).textDecorationLine,
            overflow: document.documentElement.scrollWidth > innerWidth,
          };
        });
        expect(dimensions.row).toBeCloseTo(dimensions.scroll, 0);
        expect(dimensions.padding).toBe("0px");
        expect(dimensions.decoration).toBe("none");
        expect(dimensions.overflow).toBe(false);
      }
    }
  }
});

test("the diff groups its label and path and scrolls long code with the keyboard", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 600 });
  const parsed = await parseMarkdown(change("line=212", "1234567890".repeat(20)), {
    plugins: [diffPlugin()],
  });
  const html = await renderHtmlFromDocument(parsed, { components });
  await page.setContent(`${prose}<main class="prose">${html}</main>`);
  const label = await page.locator(".cd-label").boundingBox();
  const path = await page.locator(".cd-file").boundingBox();
  expect(path!.x).toBe(label!.x);
  expect(path!.y).toBeGreaterThanOrEqual(label!.y + label!.height);
  const counts = await page.locator(".cd-counts").boundingBox();
  expect(counts!.y).toBe(label!.y);
  expect(counts!.x + counts!.width).toBeLessThanOrEqual(344);
  const scroll = page.getByRole("region", { name: `Code changes in ${file}` });
  await scroll.focus();
  await expect(scroll).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => scroll.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("a diff's counts stay readable when the page's theme and the system's disagree", async ({
  page,
}) => {
  // shadcn's neutral theme, set by class while the system says the opposite.
  const themes = {
    dark: "--background:#0a0a0a;--foreground:#fafafa;--accent:#262626",
    light: "--background:#fff;--foreground:#0a0a0a;--accent:#f5f5f5",
  };
  for (const [system, theme] of [
    ["light", themes.dark],
    ["dark", themes.light],
  ] as const) {
    await page.emulateMedia({ colorScheme: system });
    await page.goto("/diff/");
    await page.addStyleTag({ content: `main{${theme}}` });
    const ratios = await page
      .locator(".cd")
      .first()
      .evaluate((figure) => {
        // Painting a color resolves color-mix() and transparency the way the page shows them.
        const canvas = document.createElement("canvas").getContext("2d")!;
        const paint = (color: string, under: string) => {
          canvas.fillStyle = under;
          canvas.fillRect(0, 0, 1, 1);
          canvas.fillStyle = color;
          canvas.fillRect(0, 0, 1, 1);
          return `rgb(${canvas.getImageData(0, 0, 1, 1).data.slice(0, 3).join(" ")})`;
        };
        const luminance = (color: string) =>
          [...paint(color, "#000").matchAll(/\d+/g)]
            .map(([channel]) => Number(channel) / 255)
            .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
            .reduce((sum, c, index) => sum + c * [0.2126, 0.7152, 0.0722][index]!, 0);
        const header = paint(
          getComputedStyle(figure.querySelector("figcaption")!).backgroundColor,
          getComputedStyle(figure).backgroundColor,
        );
        return [".cd-added", ".cd-removed"].map((selector) => {
          const [high, low] = [
            luminance(getComputedStyle(figure.querySelector(selector)!).color),
            luminance(header),
          ].sort((a, b) => b - a);
          return (high! + 0.05) / (low! + 0.05);
        });
      });
    for (const ratio of ratios) expect(ratio).toBeGreaterThanOrEqual(4.5);
  }
});
