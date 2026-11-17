import { fileURLToPath } from "node:url";
import { createHtmlRenderer } from "@comark/html";
import { expect, test } from "@playwright/test";
import { build } from "vite";
import time, { components } from "../packages/time/src/html.ts";

let bundle: string;
test.beforeAll(async () => {
  const result = await build({
    configFile: false,
    logLevel: "error",
    define: { "process.env.NODE_ENV": '"production"' },
    build: {
      write: false,
      lib: {
        entry: fileURLToPath(
          new URL("../packages/properties/test/fixtures/lifecycle.ts", import.meta.url),
        ),
        formats: ["iife"],
        name: "DateTest",
      },
    },
  });
  const output = (Array.isArray(result) ? result[0]! : result) as {
    output: { type: string; code?: string }[];
  };
  bundle = output.output.find((chunk) => chunk.type === "chunk")!.code!;
});

for (const framework of ["react", "vue"])
  for (const populated of [false, true])
    test(`${framework}: ${populated ? "populated → empty → populated" : "empty → populated"} keeps a live runtime`, async ({
      page,
    }) => {
      await page.clock.install({ time: new Date("2026-11-04T12:00:00Z") });
      await page.setContent("<main></main>");
      await page.addScriptTag({ content: bundle });
      await page.evaluate(
        ({ framework, populated }) => {
          const app = window as unknown as {
            DateTest: {
              mount: (
                target: HTMLElement,
                framework: string,
                populated: boolean,
              ) => (shown: boolean) => void;
            };
            update: (shown: boolean) => void;
          };
          app.update = app.DateTest.mount(document.querySelector("main")!, framework, populated);
        },
        { framework, populated },
      );
      const date = page.locator(".cfm time");
      const update = (shown: boolean) =>
        page.evaluate(
          (shown) => (window as unknown as { update: (shown: boolean) => void }).update(shown),
          shown,
        );
      if (populated) {
        await expect(date).toContainText("2 days ago");
        await update(false);
        await expect(date).toHaveCount(0);
      }
      await update(true);
      await expect(date).toContainText("2 days ago");
      await expect(page.locator("style[data-comark-time]")).toHaveCount(1);
      await date.focus();
      await page.keyboard.press("Escape");
      await expect(date).toHaveAttribute("data-dismissed", "");
      await page.clock.setSystemTime(new Date("2026-11-05T12:00:00Z"));
      await page.clock.runFor(60001);
      await expect(date).toContainText("3 days ago");
    });

test("cached refresh retains locale and prop-over-option threshold", async ({ page }) => {
  const render = createHtmlRenderer({
    plugins: [
      time({ now: "2026-11-04T12:00:00Z", locale: "es", threshold: "1d", timeZone: "UTC" }),
    ],
    components,
  });
  await page.clock.install({ time: new Date("2026-11-04T12:00:00Z") });
  await page.setContent(
    await render(
      ':time[2026-11-01]{threshold="none"} :time[2023-11-04]{threshold="none"} :time[2026-11-01]',
    ),
  );
  const before = await page.locator("time").allTextContents();
  expect(before[0]).toContain("hace 3 días");
  await page.addScriptTag({ content: bundle });
  await page.evaluate(() =>
    (
      window as unknown as { DateTest: { relativize: (root: Document) => void } }
    ).DateTest.relativize(document),
  );
  expect(await page.locator("time").allTextContents()).toEqual(before);
  await expect(page.locator("time").nth(2)).toHaveAttribute("data-mode", "absolute");
});
