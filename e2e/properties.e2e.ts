import { expect, test } from "@playwright/test";
import { propertiesBundle } from "../packages/properties/test/svelte-bundle.ts";

let bundle: string;
test.beforeAll(async () => {
  bundle = await propertiesBundle();
});

test.use({ locale: "es-ES" });

test("Svelte localizes dates on mount and in-place snippet updates", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
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
  await expect(date).toHaveText("23 oct 2026");
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
  await expect(date).toHaveText("1 nov 2026");
  await update("2026-11-01", "Nov 1, 2026 (updated)");
  await expect(date).toHaveText("1 nov 2026");
  await update("", "");
  await expect(date).toHaveCount(0);
  await update("2026-12-02", "Dec 2, 2026");
  await expect(date).toHaveText("2 dic 2026");
  expect(await box!.evaluate((element) => element === document.querySelector(".cfm"))).toBe(true);
  await expect(page.locator(".cfm time[lang]")).toHaveText("23. Okt. 2026");
  expect(errors).toEqual([]);
});
