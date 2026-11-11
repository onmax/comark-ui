import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";

let folder: string;
let url: string;

test.use({ viewport: { width: 1440, height: 900 } });

test.beforeAll(() => {
  folder = mkdtempSync(join(tmpdir(), "comark-data-report-"));
  const output = join(folder, "report.html");
  execFileSync(
    process.execPath,
    [
      fileURLToPath(new URL("../skills/data-report/scripts/build.mjs", import.meta.url)),
      fileURLToPath(new URL("../skills/data-report/references/example.md", import.meta.url)),
      output,
    ],
    { cwd: fileURLToPath(new URL("../packages/ui/", import.meta.url)) },
  );
  url = pathToFileURL(output).href;
});

test.afterAll(() => rmSync(folder, { recursive: true, force: true }));

test("the generated report tracks its outline in both navigation areas", async ({ page }) => {
  await page.goto(url);
  const outline = page.locator(".dr-side ol a");
  await expect(outline).toHaveCount(7);
  for (const link of await outline.all()) {
    const target = await link.getAttribute("href");
    await expect(page.locator(`.dr-body .cl-heading > ${target}`)).toHaveCount(1);
  }
  await expect(page.locator(".dr-nav a[aria-current]")).toHaveAttribute("href", "#what-stands-out");
  await expect(page.locator(".dr-side ol a[aria-current]")).toHaveAttribute(
    "href",
    "#what-stands-out",
  );

  for (const id of ["customers", "sources"]) {
    await page.locator(`.dr-body #${id}`).evaluate((heading) => {
      window.scrollTo(0, window.scrollY + heading.getBoundingClientRect().top - 80);
    });
    await expect(page.locator(".dr-nav a[aria-current]")).toHaveAttribute("href", `#${id}`);
    await expect(page.locator(".dr-side ol a[aria-current]")).toHaveAttribute("href", `#${id}`);
  }
});

test("outline fragments leave wrapped headings below the sticky header", async ({ page }) => {
  await page.goto(url);
  const headerBottom = await page
    .locator(".dr-top")
    .evaluate((header) => header.getBoundingClientRect().bottom);
  await page.locator('.dr-nav a[href="#customers"]').click();
  await expect(page).toHaveURL(/#customers$/);
  await expect
    .poll(() =>
      page
        .locator(".dr-body #customers")
        .evaluate((heading) => heading.getBoundingClientRect().top),
    )
    .toBeGreaterThanOrEqual(headerBottom + 15);
});
