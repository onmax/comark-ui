import { createHtmlRenderer } from "@comark/html";
import { expect, type Page, test } from "@playwright/test";
import comarkUi from "../packages/ui/src/html.ts";

// Tabs pick one of many, so the motion layer's select effect slides the open tab's surface to the new tab.
const offline = { chips: { download: false }, badge: { download: false }, icon: { fetch: false } };
const tabs =
  '::tabs\n:::tabs-item{label="Alpha"}\nOne\n:::\n\n:::tabs-item{label="Beta"}\nTwo\n:::\n\n:::tabs-item{label="Gamma tab"}\nThree\n:::\n::';

async function open(page: Page, markdown: string) {
  const { plugins, components } = comarkUi(offline);
  const html = await createHtmlRenderer({ plugins, components })(markdown);
  await page.goto("/no-such-page");
  await page.setContent(
    `<!doctype html><html><body style="width:36rem;margin:2rem">${html}</body></html>`,
  );
  await expect.poll(() => page.evaluate(() => !!window.__comarkMotion)).toBe(true);
}

// The indicator of `name`, its box on screen, the box of its tab, and what the layer writes on it.
const sample = (page: Page, name: string) =>
  page.getByRole("tab", { name }).evaluate((tab) => {
    const indicator = tab.querySelector<HTMLElement>(":scope>[data-motion-indicator]")!;
    const box = indicator.getBoundingClientRect();
    const own = tab.getBoundingClientRect();
    return {
      left: box.left,
      width: box.width,
      tabLeft: own.left,
      tabWidth: own.width,
      translate: indicator.style.translate,
      scale: indicator.style.scale,
      shown: getComputedStyle(indicator).backgroundColor !== "rgba(0, 0, 0, 0)",
    };
  });

test("the open tab's surface is a real element that shows without any motion", async ({ page }) => {
  await open(page, tabs);
  const first = await sample(page, "Alpha");
  expect(first.shown).toBe(true);
  expect(first.left).toBeCloseTo(first.tabLeft, 0);
  expect(first.width).toBeCloseTo(first.tabWidth, 0);
  expect((await sample(page, "Beta")).shown).toBe(false);
});

test("switching tabs slides the surface to the new tab with the layer's springs", async ({
  page,
}) => {
  await open(page, tabs);
  await page.evaluate(() => window.__comarkMotion?.setMotionSlowFactor(4));
  const start = await sample(page, "Alpha");
  await page.getByRole("tab", { name: "Gamma tab" }).click();
  // Mid-flight the layer writes `translate` and `scale` inline, and the surface sits between the two tabs.
  await expect.poll(async () => (await sample(page, "Gamma tab")).translate).not.toBe("");
  const flying = await sample(page, "Gamma tab");
  expect(flying.scale).not.toBe("");
  expect(flying.left).toBeGreaterThan(start.left - 1);
  expect(flying.left).toBeLessThan(flying.tabLeft - 1);
  expect((await sample(page, "Alpha")).shown).toBe(false);
  // At rest the inline styles are gone, and the surface covers the new tab.
  await expect
    .poll(async () => (await sample(page, "Gamma tab")).translate, { timeout: 8000 })
    .toBe("");
  const rest = await sample(page, "Gamma tab");
  expect(rest.scale).toBe("");
  expect(rest.left).toBeCloseTo(rest.tabLeft, 0);
  expect(rest.width).toBeCloseTo(rest.tabWidth, 0);
});

test("under reduced motion the surface is on the new tab at once", async ({ page }) => {
  await open(page, tabs);
  await page.evaluate(() => window.__comarkMotion?.forceReducedMotion(true));
  await page.getByRole("tab", { name: "Beta" }).click();
  // Watch a few frames: the layer never moves it.
  const frames = await page.getByRole("tab", { name: "Beta" }).evaluate(
    (tab) =>
      new Promise<string[]>((resolve) => {
        const indicator = tab.querySelector<HTMLElement>(":scope>[data-motion-indicator]")!;
        const seen: string[] = [];
        const step = (left: number) => {
          seen.push(`${indicator.style.translate}|${indicator.style.scale}`);
          if (left) requestAnimationFrame(() => step(left - 1));
          else resolve(seen);
        };
        step(10);
      }),
  );
  expect(frames.every((frame) => frame === "|")).toBe(true);
  const rest = await sample(page, "Beta");
  expect(rest.shown).toBe(true);
  expect(rest.left).toBeCloseTo(rest.tabLeft, 0);
});

test("a magic move's step tabs slide a copy of the open tab's look", async ({ page }) => {
  await open(page, "::magic-move\n```ts\nconst a = 1\n```\n\n```ts\nconst a = 2\n```\n::");
  await page.evaluate(() => window.__comarkMotion?.setMotionSlowFactor(4));
  const tabs = page.locator(".cmv-tab");
  await tabs.nth(1).click();
  await expect(page.locator(".cmv-list>[data-motion-copy]")).toHaveCount(1);
  await expect(page.locator(".cmv-list>[data-motion-copy]")).toHaveCount(0, { timeout: 8000 });
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
});
