import { expect, test } from "@playwright/test";
import { five, open, parts } from "./carousel-fixture.ts";

test.use({ browserName: "firefox" });

test("the visible range under zoom out excludes clipped slides", async ({ page }) => {
  await open(page, five, { style: "body{zoom:.7}" });
  await expect(parts(page).count).toHaveText("1–3 / 5");
});

test("zoomed slides fit without bleed and keep their size with bleed", async ({ page }) => {
  await open(page, '::carousel{title="Tour" columns=2}\nOne\n\nTwo\n::', {
    style: "body{zoom:1.5}.cc{--cc-gap:10%}.cc-track{padding-inline:24px}",
  });
  const { root, track, next } = parts(page);
  const geometry = () =>
    track.evaluate((node) => {
      const [first, second] = node.querySelectorAll(".cc-slide");
      const start = first!.getBoundingClientRect();
      const end = second!.getBoundingClientRect();
      return { width: start.width, gap: end.left - start.right, right: end.right };
    });
  await expect(track).toBeVisible();
  await expect(next).toBeHidden();
  const before = await geometry();
  const trackBefore = (await track.boundingBox())!;
  expect(before.right).toBeCloseTo(trackBefore.x + trackBefore.width - 36, 0);
  expect(await track.evaluate((node) => node.scrollWidth - node.clientWidth)).toBe(0);

  await root.evaluate((node) => node.style.setProperty("--cc-bleed", "calc(100% - 704px)"));
  const after = await geometry();
  expect(after.width).toBeCloseTo(before.width, 0);
  expect(after.gap).toBeCloseTo(before.gap, 0);
  expect(after.right).toBeCloseTo(before.right, 0);
  expect((await track.boundingBox())!.width).toBeCloseTo(trackBefore.width + 96, 0);
});
