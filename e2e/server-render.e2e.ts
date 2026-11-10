import { expect, type Page, test } from "@playwright/test";
import { parseMarkdown } from "comark";
import carousel from "../packages/carousel/src/index.ts";
import { components as carouselComponents } from "../packages/carousel/src/vue.ts";
import { css as carouselCss } from "../packages/carousel/src/styles.ts";
import magicMove from "../packages/magic-move/src/index.ts";
import { components as magicMoveComponents } from "../packages/magic-move/src/vue.ts";
import { css as magicMoveCss } from "../packages/magic-move/src/styles.ts";
import table from "../packages/table/src/index.ts";
import { components as tableComponents } from "../packages/table/src/vue.ts";
import { css as tableCss } from "../packages/table/src/styles.ts";
import tabs from "../packages/tabs/src/index.ts";
import { components as tabsComponents } from "../packages/tabs/src/vue.ts";
import { css as tabsCss } from "../packages/tabs/src/styles.ts";
import { vueServerRender } from "../packages/ui/test/vue-server-render.ts";

// A Vue server render paints before the app hydrates and the components start their scripts. Each block must already
// paint the layout its script gives it, or the page jumps when the app hydrates.
const fence = "```";
const blocks = [
  {
    name: "magic-move",
    root: ".cmv",
    ready: "data-magic-move-ready",
    css: magicMoveCss,
    plugin: magicMove(),
    components: magicMoveComponents,
    markdown: `::magic-move\n${fence}ts [Start]\nconst a = 1\n${fence}\n\n${fence}ts [Next]\nconst a = 1\nconst b = 2\n${fence}\n::`,
  },
  {
    name: "tabs",
    root: ".ct",
    ready: "data-tabs-ready",
    css: tabsCss,
    plugin: tabs(),
    components: tabsComponents,
    markdown: `::code-group\n${fence}sh [pnpm]\npnpm add a\n${fence}\n\n${fence}sh [npm]\nnpm install a\n${fence}\n::`,
  },
  {
    name: "carousel",
    root: ".cc",
    ready: "data-carousel-ready",
    css: carouselCss,
    plugin: carousel(),
    components: carouselComponents,
    markdown: "::carousel\nOne\n\nTwo\n::",
  },
  {
    name: "table",
    root: ".ctb",
    ready: "data-table-ready",
    css: tableCss,
    plugin: table(),
    components: tableComponents,
    markdown: `::table{sort}\n${fence}csv\nname,size\na,1\nb,2\n${fence}\n::`,
  },
];

const open = async (page: Page, block: (typeof blocks)[number]) => {
  const value = await parseMarkdown(block.markdown, { plugins: [block.plugin] });
  const html = await vueServerRender(value, block.components);
  await page.setContent(
    `<!doctype html><html><head><style>${block.css}</style></head><body style="width:40rem;margin:2rem">${html}</body></html>`,
  );
};
const height = (page: Page, root: string) =>
  page
    .locator(root)
    .first()
    .evaluate((element) => element.getBoundingClientRect().height);

for (const block of blocks) {
  test(`a Vue server render of ${block.name} keeps its height when the script starts`, async ({
    page,
  }) => {
    await open(page, block);
    const before = await height(page, block.root);
    await page.evaluate((ready) => document.documentElement.setAttribute(ready, ""), block.ready);
    expect(await height(page, block.root)).toBe(before);
  });
}

test.describe("without scripts", () => {
  test.use({ javaScriptEnabled: false });
  test("a Vue server render of magic-move shows every step", async ({ page }) => {
    await open(page, blocks[0]!);
    await expect(page.locator(".cmv-step")).toHaveCount(2);
    for (const step of await page.locator(".cmv-step").all()) await expect(step).toBeVisible();
    await expect(page.getByRole("tablist")).toBeHidden();
  });
});
