import { createHtmlRenderer } from "@comark/html";
import { expect, type Page, test } from "@playwright/test";
import comarkUi from "../packages/ui/src/html.ts";

const render = createHtmlRenderer(
  comarkUi({
    chips: { download: false },
    badge: { download: false },
    icon: { fetch: false },
    diagrams: { draw: false },
  }),
);

const flowchart = `\`\`\`mermaid
flowchart LR
  A[Module] -->|"addTemplate()"| B["nuxt.options.build.templates<br/>stored, not run"]
  B -->|"generateApp() at startup<br/>runs getContents"| C["nuxt.vfs<br/>text in memory"]
  C --> D["Vite loads #build/..."]
\`\`\``;
const small = "```mermaid\nflowchart TD\n  A --> B\n```";
const compare =
  "::compare\n![Before](https://example.com/a.png)\n![After](https://example.com/b.png)\n::";

// A 46rem column in a 1440px window, the way a docs page or a review doc lays out its text.
async function column(page: Page, room?: string) {
  await page.setViewportSize({ width: 1440, height: 900 });
  const style = room ? `--comark-wide-room:${room};` : "";
  await page.setContent(
    `<!doctype html><meta charset="utf-8"><main style="width:46rem;margin:auto;${style}">${await render(
      [flowchart, small, compare].join("\n\n"),
    )}</main>`,
  );
}

const widths = (page: Page) =>
  page.evaluate(() => {
    const main = document.querySelector("main")!.getBoundingClientRect();
    const [long, short] = [...document.querySelectorAll<HTMLElement>(".pele-diagram")];
    const svg = long!.querySelector("svg")!.getBoundingClientRect();
    const box = (node: Element) => node.getBoundingClientRect();
    return {
      main: main.width,
      center: main.left + main.width / 2,
      long: box(long!),
      svg: svg.width,
      natural: Number(long!.querySelector("svg")!.getAttribute("width")),
      short: box(short!).width,
      shortSvg: short!.querySelector("svg")!.getBoundingClientRect().width,
      shortNatural: Number(short!.querySelector("svg")!.getAttribute("width")),
      compare: box(document.querySelector(".ca-compare")!).width,
    };
  });

test("wide blocks keep to the column until the page gives them room", async ({ page }) => {
  await column(page);
  const narrow = await widths(page);
  expect(narrow.long.width).toBe(narrow.main);
  expect(narrow.compare).toBe(narrow.main);
  // A small diagram keeps its own size instead of growing to the scroll threshold.
  expect(narrow.shortSvg).toBeCloseTo(narrow.shortNatural, 0);
});

test("a wide diagram grows to its own width, centered on the column, and a compare to the maximum", async ({
  page,
}) => {
  await column(page, "calc(100vw - 3rem)");
  const wide = await widths(page);
  expect(wide.svg).toBeCloseTo(wide.natural, 0);
  expect(wide.long.width).toBeGreaterThan(wide.main);
  expect(wide.long.left + wide.long.width / 2).toBeCloseTo(wide.center, 0);
  expect(wide.compare).toBe(72 * 16);
  expect(wide.short).toBe(wide.main);
});
