import { createHtmlRenderer } from "@comark/html";
import { expect, type Page, test } from "@playwright/test";
import comarkUi from "../packages/ui/src/html.ts";

const render = createHtmlRenderer(
  comarkUi({
    outline: { rail: true },
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
const text = Array.from({ length: 8 }, () => "Pigeons home from far away. ".repeat(12)).join(
  "\n\n",
);
const sections = (extra = "") =>
  [
    "# Pigeon tracker",
    `## Install\n\n${text}`,
    extra,
    `## Usage\n\n${text}`,
    `### Options\n\n${text}`,
    `## FAQ\n\n${text}`,
  ]
    .filter(Boolean)
    .join("\n\n");

// A 46rem column, the way a review doc lays out its text. With `room`, the page gives wide blocks the room on each side
// of it, and takes the outline's column off the room after it while the outline keeps one, as the outline page's docs
// show.
async function open(page: Page, width: number, { room = false, diagram = false } = {}) {
  await page.setViewportSize({ width, height: 800 });
  const css = room
    ? "main{--comark-wide-start:calc((100vw - 100%) / 2 - 1.5rem);--comark-wide-end:calc((100vw - 100%) / 2 - 1.5rem)}" +
      ":root[data-comark-rail] main{--comark-wide-end:calc((100vw - 100%) / 2 - 1.5rem - var(--comark-rail-width))}"
    : "";
  await page.setContent(
    `<!doctype html><meta charset="utf-8"><style>body{margin:0}main{width:46rem;margin:auto}${css}</style><main>${await render(
      sections(diagram ? flowchart : ""),
    )}</main>`,
  );
}

const box = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((node) => node.getBoundingClientRect().toJSON() as DOMRect);
const clientWidth = (page: Page) => page.evaluate(() => document.documentElement.clientWidth);
const reserved = (page: Page) =>
  page.evaluate(() => document.documentElement.hasAttribute("data-comark-rail"));

test("the outline sits beside a 46rem column, 4rem from the text", async ({ page }) => {
  await open(page, 1440);
  const rail = page.locator(".cto-rail");
  await expect(rail).toBeVisible();
  const [main, nav, edge] = [
    await box(page, "main"),
    await box(page, ".cto-rail"),
    await clientWidth(page),
  ];
  expect(nav.left - main.right).toBeCloseTo(64, 0);
  expect(nav.width).toBeLessThanOrEqual(240);
  expect(nav.right).toBeLessThanOrEqual(edge - 24);
  await expect(rail.locator(".cto-title")).toHaveText("On this page");
  expect(await reserved(page)).toBe(false);
});

test("the outline hides where it doesn't fit", async ({ page }) => {
  await open(page, 900);
  await expect(page.locator(".cto-rail")).toBeHidden();
});

test("the outline keeps clear of what the page covers at its right edge", async ({ page }) => {
  await open(page, 1440);
  await expect(page.locator(".cto-rail")).toBeVisible();
  await page.evaluate(() =>
    document.documentElement.style.setProperty("--comark-inset-end", "400px"),
  );
  // The column ends at 1088px, and the panel covers everything right of about 1025px, so the outline has no room.
  await expect(page.locator(".cto-rail")).toBeHidden();
  await page.evaluate(() =>
    document.documentElement.style.setProperty("--comark-inset-end", "100px"),
  );
  await expect(page.locator(".cto-rail")).toBeVisible();
  const [nav, edge] = [await box(page, ".cto-rail"), await clientWidth(page)];
  expect(nav.right).toBeLessThanOrEqual(edge - 100 - 24);
});

test("beside a long diagram, the outline keeps a column right of it, and the diagram moves toward the room before the text", async ({
  page,
}) => {
  await open(page, 1440, { room: true, diagram: true });
  const rail = page.locator(".cto-rail");
  await expect(rail).toBeVisible();
  expect(await reserved(page)).toBe(true);
  const [diagram, nav, edge] = [
    await box(page, ".pele-diagram"),
    await box(page, ".cto-rail"),
    await clientWidth(page),
  ];
  const natural = await page
    .locator(".pele-diagram svg")
    .evaluate((svg) => Number(svg.getAttribute("width")));
  // The diagram keeps its own width, and the outline sits 2.5rem to 4rem right of it (it closes the gap when the page
  // measures its room from 100vw, scrollbar included), inside the window.
  expect(
    await page.locator(".pele-diagram svg").evaluate((svg) => svg.getBoundingClientRect().width),
  ).toBeCloseTo(natural, 0);
  expect(nav.left - diagram.right).toBeGreaterThanOrEqual(40);
  expect(nav.left - diagram.right).toBeLessThanOrEqual(64);
  expect(nav.width).toBe(200);
  expect(nav.right).toBeLessThanOrEqual(edge - 24);
  expect(
    await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--comark-rail-width"),
    ),
  ).toBe("264px");
});

test("where its column would narrow a diagram, the outline hides instead", async ({ page }) => {
  await open(page, 1100, { room: true, diagram: true });
  const rail = page.locator(".cto-rail");
  // The script has run: the scroll-spy marks the first heading even while the outline is hidden.
  await expect(rail.locator("a[aria-current]")).toHaveCount(1);
  await expect(rail).toBeHidden();
  expect(await reserved(page)).toBe(false);
  const diagram = await box(page, ".pele-diagram");
  // Without the outline's column, the diagram takes all the room the page gives it: 100vw less 3rem.
  expect(diagram.width).toBeCloseTo(1100 - 48, 0);
});

test("the outline marks the heading being read, and its links scroll to them", async ({ page }) => {
  await open(page, 1440);
  const current = page.locator(".cto-rail a[aria-current]");
  await expect(current).toHaveText("Install");
  await page.locator("#options").evaluate((heading) => heading.scrollIntoView());
  await expect(current).toHaveText("Options");
  await page.evaluate(() => scrollTo(0, 0));
  await expect(current).toHaveText("Install");
  await page.locator(".cto-rail a", { hasText: "FAQ" }).click();
  await expect(current).toHaveText("FAQ");
  await expect
    .poll(() => page.locator("#faq").evaluate((h) => Math.round(h.getBoundingClientRect().top)))
    .toBeLessThan(96);
  expect(await current.getAttribute("aria-current")).toBe("location");
});

test("at the bottom of a scrolling container, the last section is the one being read", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 800 });
  // A short last section never reaches the top of the container on its own.
  const markdown = `## Install\n\n${text}\n\n## Usage\n\n${text}\n\n## FAQ\n\nShort.`;
  await page.setContent(
    `<!doctype html><meta charset="utf-8"><style>body{margin:0}.scroll{height:100vh;overflow:auto}main{width:46rem;margin:auto}</style><div class="scroll"><main>${await render(markdown)}</main></div><div class="widget" style="position:fixed;bottom:0;height:40px;overflow:auto"><div style="height:200px"></div></div>`,
  );
  const current = page.locator(".cto-rail a[aria-current]");
  await expect(current).toHaveText("Install");
  await page.locator(".scroll").evaluate((scroll) => scroll.scrollTo(0, scroll.scrollHeight));
  await expect(current).toHaveText("FAQ");
  // A widget that scrolls on its own doesn't move the document.
  await page.locator(".widget").evaluate((widget) => widget.scrollTo(0, 50));
  await page.waitForTimeout(100);
  await expect(current).toHaveText("FAQ");
});

test("when the document with the outline goes, the next one's outline takes over", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 800 });
  const doc = async (title: string) =>
    `<main style="width:46rem;margin:auto">${await render(`## ${title}\n\n${text}\n\n## ${title} too`)}</main>`;
  await page.setContent(
    `<!doctype html><meta charset="utf-8"><style>body{margin:0}</style>${await doc("First")}${await doc("Second")}`,
  );
  await expect(page.locator(".cto-rail").first()).toBeVisible();
  await page
    .locator("main")
    .first()
    .evaluate((main) => main.remove());
  const rail = page.locator(".cto-rail");
  await expect(rail).toHaveCount(1);
  await expect(rail).toBeVisible();
  await expect(rail.locator("a[aria-current]")).toHaveText("Second");
  // It follows the remaining document's column: it moves with it when the window narrows.
  const before = await box(page, ".cto-rail");
  await page.setViewportSize({ width: 1300, height: 800 });
  await expect.poll(async () => (await box(page, ".cto-rail")).left).toBeLessThan(before.left);
});
