import { expect, test } from "@playwright/test";

test("client navigation preserves the app and reinitializes page scripts", async ({ page }) => {
  await page.goto("/zoom/");
  const marker = await page.evaluate(() => {
    const w = window as typeof window & { __comarkNavigation?: number };
    return (w.__comarkNavigation ??= Math.random());
  });
  await page.locator(".sidebar").getByRole("link", { name: "Tabs", exact: true }).click();
  await expect(page).toHaveURL(/\/tabs\/$/);
  await expect(page.locator("h1")).toHaveText("Tabs");
  await page.locator(".sidebar").getByRole("link", { name: "Annotate", exact: true }).click();
  await expect(page).toHaveURL(/\/annotate\/$/);
  await expect(page.locator("h1")).toHaveText("Annotate");
  // The npmx chip's view transition holds the pointer until it ends.
  await page.waitForFunction(
    () =>
      !document
        .getAnimations()
        .some((animation) =>
          (animation.effect as KeyframeEffect | null)?.pseudoElement?.startsWith(
            "::view-transition",
          ),
        ),
  );
  // The body came as island JSON, so its zoom script had to run again for a mark to open the zoom.
  await page.locator("main .ca-compare .ca-mark").first().click({ force: true });
  await expect(page.locator(".cz-dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".cz-dialog")).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(/\/tabs\/$/);
  expect(
    await page.evaluate(
      () => (window as typeof window & { __comarkNavigation?: number }).__comarkNavigation,
    ),
  ).toBe(marker);
});

test("the landing canvas paints its cards centered after a client navigation", async ({ page }) => {
  await page.goto("/zoom/");
  // Every frame's position of the first card, from the click until the canvas has settled.
  const positions = await page.evaluate(async () => {
    const seen: number[] = [];
    document.querySelector<HTMLAnchorElement>('header a[href="/"]')!.click();
    const start = performance.now();
    while (performance.now() - start < 1500) {
      await new Promise(requestAnimationFrame);
      const view = document.querySelector<HTMLElement>(".canvas-viewport");
      if (!view) continue;
      const card = [...document.querySelectorAll<HTMLElement>(".canvas-stage .demo")].find(
        (card) => Number.parseFloat(card.style.left) === 0,
      );
      if (card)
        seen.push(Math.round(card.getBoundingClientRect().x - view.getBoundingClientRect().x));
    }
    const view = document.querySelector<HTMLElement>(".canvas-viewport")!;
    const expected = ((((view.clientWidth - 300) % 320) + 320) % 320) / 2;
    return { seen, expected: Math.round(expected) };
  });
  expect(positions.seen.length).toBeGreaterThan(0);
  expect(new Set(positions.seen).size).toBe(1);
  expect(positions.seen[0]).toBe(positions.expected);
});

test("a page change jumps to its scroll position instead of sliding there", async ({ page }) => {
  // Both pages are taller than the position, so the browser doesn't clamp it while the next one comes in.
  await page.goto("/charts/");
  await page.evaluate(() => window.scrollTo({ top: 1200, behavior: "instant" }));
  // Every scroll position from the link's click, or going back, until the page has settled.
  const frames = (back: boolean) =>
    page.evaluate(async (back) => {
      const seen = new Set([Math.round(scrollY)]);
      if (back) history.back();
      else document.querySelector<HTMLAnchorElement>('.sidebar a[href="/zoom/"]')!.click();
      const start = performance.now();
      while (performance.now() - start < 1500) {
        await new Promise(requestAnimationFrame);
        seen.add(Math.round(scrollY));
      }
      return [...seen];
    }, back);
  expect(await frames(false)).toEqual([1200, 0]);
  await expect(page).toHaveURL(/\/zoom\/$/);
  expect(await frames(true)).toEqual([0, 1200]);
  await expect(page).toHaveURL(/\/charts\/$/);
});

test("the sidebar stays where it was when one of its links opens another page", async ({
  page,
}) => {
  await page.goto("/annotate/");
  // Every scroll position of the sidebar's column from the click until the next page has been in for a while.
  const { before, seen } = await page.evaluate(async () => {
    const column = () => document.querySelector<HTMLElement>(".sidebar .pages")!;
    column().scrollTop = column().scrollHeight;
    const before = Math.round(column().scrollTop);
    const seen = new Set([before]);
    document.querySelector<HTMLAnchorElement>('.sidebar a[href="/tabs/"]')!.click();
    const start = performance.now();
    let frames = 0;
    while (frames < 30 && performance.now() - start < 5000) {
      await new Promise(requestAnimationFrame);
      seen.add(Math.round(column().scrollTop));
      if (document.querySelector("h1")?.textContent === "Tabs") frames++;
    }
    return { before, seen: [...seen] };
  });
  expect(before).toBeGreaterThan(0);
  expect(seen).toEqual([before]);
  await expect(page.locator("h1")).toHaveText("Tabs");
});

test("the sidebar restores each browser history entry's position", async ({ page }) => {
  await page.goto("/annotate/");
  const first = await page.locator(".sidebar .pages").evaluate((column) => {
    column.scrollTop = 120;
    return Math.round(column.scrollTop);
  });
  await page.locator('.sidebar a[href="/tabs/"]').click();
  await expect(page).toHaveURL(/\/tabs\/$/);
  const second = await page.locator(".sidebar .pages").evaluate((column) => {
    column.scrollTop = column.scrollHeight;
    return Math.round(column.scrollTop);
  });
  expect(second).toBeGreaterThan(first);
  await page.goBack();
  await expect(page).toHaveURL(/\/annotate\/$/);
  await expect
    .poll(() => page.locator(".sidebar .pages").evaluate((column) => Math.round(column.scrollTop)))
    .toBe(first);
  await page.goForward();
  await expect(page).toHaveURL(/\/tabs\/$/);
  await expect
    .poll(() => page.locator(".sidebar .pages").evaluate((column) => Math.round(column.scrollTop)))
    .toBe(second);
});

test("the sidebar shows the current page's link on a first load", async ({ page }) => {
  await page.goto("/zoom/");
  await expect(page.locator('.sidebar .pages a[aria-current="page"]')).toBeInViewport();
});
