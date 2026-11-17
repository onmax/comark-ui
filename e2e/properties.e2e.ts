import { createHtmlRenderer } from "@comark/html";
import { expect, type Page, test } from "@playwright/test";
import properties, { components } from "../packages/properties/src/html.ts";
import { propertiesBundle } from "../packages/properties/test/svelte-bundle.ts";

let bundle: string;
test.beforeAll(async () => {
  bundle = await propertiesBundle();
});

// The reader's clock: 4 November 2026, noon UTC. The render below knows nothing of it, as a cached page wouldn't.
const now = new Date("2026-11-04T12:00:00Z");
const review = [
  "---",
  "status: Ready for review",
  "date: 2026-11-02",
  "shipped: 2026-09-04T09:30:00Z",
  "---",
  "",
  "The palette page now shows every token.",
].join("\n");
const render = createHtmlRenderer({
  plugins: [properties({ keys: ["status", "date", "shipped"] })],
  components,
});
const open = async (page: Page) => {
  await page.clock.install({ time: now });
  await page.setContent(
    `<!doctype html><html><body style="width:40rem;margin:8rem 2rem">${await render(review)}</body></html>`,
  );
};
const label = (page: Page, key: string) =>
  page
    .locator(`.cfm [data-key="${key}"] time`)
    .evaluate((time) => time.firstChild?.textContent ?? "");
const tip = (page: Page, key: string) => page.locator(`.cfm [data-key="${key}"] .ctm-pill`);

test.use({ timezoneId: "Europe/Madrid", locale: "es-ES" });

test("a cached render's dates read relative to the reader's clock, in English", async ({
  page,
}) => {
  await open(page);
  expect(await label(page, "date")).toBe("2 days ago");
  await expect(tip(page, "date")).toHaveText("Mon, Nov 2, 2026");
  // Past 3 weeks it's a date, and the tooltip says how far away, at the reader's time of day.
  expect(await label(page, "shipped")).toBe("Sep 4");
  await expect(tip(page, "shipped")).toHaveText(/^2 months ago · 11:30\sAM GMT\+2$/);
  await expect(page.locator('.cfm [data-key="shipped"] time')).toHaveAttribute(
    "data-mode",
    "absolute",
  );
  await expect(page.locator('.cfm [data-key="date"] time')).toHaveAttribute(
    "data-mode",
    "relative",
  );
});

test("hover opens the full date on a date row", async ({ page }) => {
  await open(page);
  await page.locator('.cfm [data-key="date"] time').hover();
  await page.clock.runFor(500);
  await expect
    .poll(() => tip(page, "date").evaluate((pill) => Number(getComputedStyle(pill).opacity)))
    .toBe(1);
});

test("the words move on with the clock while the page is open, and when it shows again", async ({
  page,
}) => {
  await open(page);
  await page.clock.runFor("24:00:00");
  expect(await label(page, "date")).toBe("3 days ago");
  // A hidden tab keeps no timer; it catches up as soon as it's shown.
  await page.clock.setSystemTime(new Date("2026-11-10T12:00:00Z"));
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(await label(page, "date")).toBe("last week");
});

test("without the script, the server's text is the date with its year", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.setContent(`<!doctype html><html><body>${await render(review)}</body></html>`);
  expect(await label(page, "date")).toBe("Nov 2, 2026");
  expect(await label(page, "shipped")).toBe("Sep 4, 2026");
  await context.close();
});

test("Svelte makes dates relative on mount and on in-place snippet updates", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.clock.install({ time: now });
  await page.setContent("<main></main>");
  await page.addScriptTag({ content: bundle });
  await page.evaluate(() => {
    const app = window as unknown as {
      PropertiesTest: { start: (target: HTMLElement) => (date: string, text: string) => void };
      updateProperties: (date: string, text: string) => void;
    };
    app.updateProperties = app.PropertiesTest.start(document.querySelector("main")!);
  });

  const date = page.locator(".cfm time:not([lang])");
  await expect(date).toHaveText("last week");
  const box = await page.locator(".cfm").elementHandle();
  const update = (date: string, text: string) =>
    page.evaluate(
      ({ date, text }) => {
        (
          window as unknown as { updateProperties: (date: string, text: string) => void }
        ).updateProperties(date, text);
      },
      { date, text },
    );

  await update("2026-11-01", "Nov 1, 2026");
  await expect(date).toHaveText("3 days ago");
  await update("2026-11-01", "Nov 1, 2026 (updated)");
  await expect(date).toHaveText("3 days ago");
  await update("", "");
  await expect(date).toHaveCount(0);
  await update("2026-12-02", "Dec 2, 2026");
  await expect(date).toHaveText("Dec 2");
  expect(await box!.evaluate((element) => element === document.querySelector(".cfm"))).toBe(true);
  // A date's `lang` sets the language of its words.
  await expect(page.locator(".cfm time[lang]")).toHaveText("letzte Woche");
  expect(errors).toEqual([]);
});
