import { createHtmlRenderer } from "@comark/html";
import { expect, type Page, test } from "@playwright/test";
import time, { components } from "../packages/time/src/html.ts";

const render = createHtmlRenderer({
  plugins: [time({ now: "2026-11-04T12:00:00Z", timeZone: "UTC", locale: "en" })],
  components,
});
const open = async (page: Page, markdown: string, style = "margin:8rem 2rem") =>
  page.setContent(
    `<!doctype html><html><body style="width:40rem;${style}">${await render(markdown)}</body></html>`,
  );
const pill = (page: Page) => page.locator(".ctm-pill").first();
const shown = (page: Page) =>
  expect
    .poll(() => pill(page).evaluate((element) => Number(getComputedStyle(element).opacity)))
    .toBe(1);
const hidden = (page: Page) =>
  expect
    .poll(() =>
      page
        .locator(".ctm-tip")
        .first()
        .evaluate((el) => getComputedStyle(el).visibility),
    )
    .toBe("hidden");
const box = async (locator: ReturnType<Page["locator"]>) => (await locator.boundingBox())!;

test("hover opens the full date right above the text, centered on it", async ({ page }) => {
  await open(page, "Opened :time[2026-11-02] by the loft.");
  const text = page.locator(".ctm");
  await text.hover();
  await shown(page);
  await expect(pill(page)).toHaveText("Mon, Nov 2, 2026");
  const [anchor, card] = [await box(text), await box(pill(page))];
  expect(card.y + card.height).toBeLessThanOrEqual(anchor.y);
  expect(anchor.y - (card.y + card.height)).toBeLessThan(16);
  expect(card.x + card.width / 2).toBeCloseTo(anchor.x + anchor.width / 2, 0);
  // It grows from the edge that touches the text.
  const origin = await pill(page).evaluate((el) => getComputedStyle(el).transformOrigin);
  expect(Number.parseFloat(origin.split(" ")[1]!)).toBeGreaterThan(card.height / 2);
  await page.mouse.move(0, 0);
  await hidden(page);
});

test("near the top of the window it opens below and grows from its top edge", async ({ page }) => {
  await open(page, "Opened :time[2026-11-02] by the loft.", "margin:0.25rem 2rem");
  const text = page.locator(".ctm");
  await text.hover();
  await shown(page);
  const [anchor, card] = [await box(text), await box(pill(page))];
  expect(card.y).toBeGreaterThanOrEqual(anchor.y + anchor.height);
  const origin = await pill(page).evaluate((el) => getComputedStyle(el).transformOrigin);
  expect(Number.parseFloat(origin.split(" ")[1]!)).toBeLessThan(card.height / 2);
});

test("hover waits before it opens, and focus doesn't", async ({ page }) => {
  await open(page, "Opened :time[2026-11-02] by the loft.");
  await page.locator(".ctm").hover();
  expect(await pill(page).evaluate((el) => Number(getComputedStyle(el).opacity))).toBeLessThan(0.5);
  await shown(page);
  await page.mouse.move(0, 0);
  await hidden(page);
  await page.keyboard.press("Tab");
  await expect(page.locator(".ctm")).toBeFocused();
  // Hover takes 300ms before it starts and 140ms to finish, so a focus that is done by now didn't wait.
  await page.waitForTimeout(220);
  expect(await pill(page).evaluate((el) => Number(getComputedStyle(el).opacity))).toBe(1);
  await page.keyboard.press("Shift+Tab");
  await hidden(page);
});

test("the tooltip stays inside the window at its edge and names the time", async ({ page }) => {
  await page.setViewportSize({ width: 420, height: 600 });
  await open(page, ":time[2026-12-25T09:30:00Z]", "margin:8rem 0");
  await page.locator(".ctm").focus();
  await shown(page);
  await expect(pill(page)).toHaveText(/^next month · 9:30\s?AM UTC$/);
  const card = await box(pill(page));
  expect(card.x).toBeGreaterThanOrEqual(0);
  expect(card.x + card.width).toBeLessThanOrEqual(420);
  await expect(page.locator(".ctm")).toHaveAttribute("aria-describedby", /^ctm-/);
});

test("reduced motion shows the tooltip without a transition", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, "Opened :time[2026-11-02].");
  await page.locator(".ctm").focus();
  const duration = await pill(page).evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(duration).toBe("0s");
  await shown(page);
});
