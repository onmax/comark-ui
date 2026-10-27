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

// A 46rem column, the way a review doc lays out its text. With `room`, the page gives wide blocks room, and moves its
// column left when the outline keeps a column of its own, as the outline page's docs show.
async function open(page: Page, width: number, { room = false, diagram = false } = {}) {
  await page.setViewportSize({ width, height: 800 });
  const css = room
    ? "main{--comark-wide-room:calc(100vw - 3rem)}" +
      ":root[data-comark-rail] main{position:relative;left:calc(var(--comark-rail-width) / -2);--comark-wide-room:calc(100vw - 3rem - var(--comark-rail-width))}"
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

test("beside a long diagram, the outline keeps a column right of it and asks the page to move the text", async ({
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
  // The diagram keeps its own width, and the outline sits 4rem right of it, inside the window.
  expect(
    await page.locator(".pele-diagram svg").evaluate((svg) => svg.getBoundingClientRect().width),
  ).toBeCloseTo(natural, 0);
  expect(nav.left - diagram.right).toBeCloseTo(64, 0);
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
