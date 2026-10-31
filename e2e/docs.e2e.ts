import { expect, test } from "@playwright/test";

test("the index's studio rests on the fixed page with its issue, and plays while the pointer is on it", async ({
  page,
}) => {
  await page.goto("/");
  const studio = page.locator(".studio");
  await studio.scrollIntoViewIfNeeded();
  await expect(studio).not.toHaveAttribute("data-phase");
  await expect(page.locator(".studio-issue")).toBeVisible();
  await expect(page.locator(".studio-issue")).toContainText("runs past the image edge");
  await studio.hover();
  await expect(studio).toHaveAttribute("data-phase", "check", { timeout: 8000 });
  await expect(page.locator(".studio-issue")).toContainText("runs past the image edge");
  await expect(page.locator(".studio-fix del")).toHaveText("92.5");
  await expect(studio).toHaveAttribute("data-phase", "render", { timeout: 8000 });
  await expect(page.locator(".studio-ok")).toBeVisible();
  await expect(page.locator(".studio-page .ca-mark[data-fixed]")).toBeVisible();
  await expect(page.locator(".studio-steps [aria-current=step]")).toHaveText("Render");

  await page.getByRole("button", { name: "Play" }).click();
  await expect(studio).toHaveAttribute("data-phase", "write");
});

test("with reduced motion, the index's studio shows the fixed Markdown and page at once", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".studio")).not.toHaveAttribute("data-phase");
  await expect(page.locator(".studio-page .ca-mark[data-fixed]")).toBeVisible();
  await expect(page.locator(".studio-fix ins")).toHaveText("82.5");
});

test("the index's canvas drags, coasts, and opens the card it was clicked on", async ({ page }) => {
  await page.goto("/");
  const viewport = page.locator(".canvas-viewport");
  await viewport.scrollIntoViewIfNeeded();
  const stage = page.locator(".canvas-stage");
  const before = await stage.evaluate((el) => el.style.transform);
  // It holds still until someone moves it.
  await page.waitForTimeout(600);
  expect(await stage.evaluate((el) => el.style.transform)).toBe(before);
  const box = (await viewport.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++)
    await page.mouse.move(box.x + box.width / 2 - i * 40, box.y + box.height / 2);
  await page.mouse.up();
  // A drag that ends on a card doesn't open it.
  await expect(page).toHaveURL("/");
  expect(await stage.evaluate((el) => el.style.transform)).not.toBe(before);

  const card = await page.evaluate(() => {
    const view = document.querySelector(".canvas-viewport")!.getBoundingClientRect();
    for (const demo of document.querySelectorAll(".canvas-stage .demo")) {
      const r = demo.getBoundingClientRect();
      if (
        r.left > view.left &&
        r.right < view.right &&
        r.top > view.top &&
        r.bottom < view.bottom - 80
      )
        return {
          x: r.left + r.width / 2,
          y: r.top + r.height / 2,
          href: demo.querySelector("a")!.getAttribute("href")!,
        };
    }
  });
  await page.mouse.click(card!.x, card!.y);
  await expect(page).toHaveURL(card!.href);
});

test("the index's canvas has a card for every playground example, each once on screen and at its own height", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator(".canvas-viewport").scrollIntoViewIfNeeded();
  await page.locator(".canvas-stage .demo").first().waitFor();
  const { cards, onScreen, unsized } = await page.evaluate(async () => {
    const fetched = document.createElement("template");
    fetched.innerHTML = await (await fetch("/canvas-cards.json")).json();
    const view = document.querySelector(".canvas-viewport")!.getBoundingClientRect();
    const live = [...document.querySelectorAll<HTMLElement>(".canvas-stage .demo")];
    const seen = live.filter((demo) => {
      const r = demo.getBoundingClientRect();
      return (
        r.right > view.left && r.left < view.right && r.bottom > view.top && r.top < view.bottom
      );
    });
    return {
      cards: [...fetched.content.querySelectorAll<HTMLElement>(".demo")].map(
        (demo) => demo.dataset.example!,
      ),
      onScreen: seen.map((demo) => demo.dataset.example),
      unsized: live.filter((demo) => !demo.style.height).length,
    };
  });
  await page.goto("/play/");
  const presets = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLAnchorElement>(".pages [data-preset]")].map(
      (link) => link.dataset.preset!,
    ),
  );
  expect(presets.length).toBeGreaterThan(40);
  expect(presets.filter((id) => !cards.includes(id))).toEqual([]);
  expect(onScreen.length).toBeGreaterThan(8);
  expect(new Set(onScreen).size).toBe(onScreen.length);
  expect(unsized).toBe(0);
});

test("the index's canvas holds still under the pointer", async ({ page }) => {
  await page.goto("/");
  await page.locator(".canvas-viewport").scrollIntoViewIfNeeded();
  const box = (await page.locator(".canvas-viewport").boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2 + 20, { steps: 4 });
  const running = await page.evaluate(() =>
    document
      .getAnimations()
      .filter((animation) =>
        (animation.effect as KeyframeEffect | null)?.target?.closest?.(".canvas-stage"),
      )
      .map((animation) => {
        const target = (animation.effect as KeyframeEffect).target!;
        return `${target.tagName}.${target.getAttribute("class")} ${animation instanceof CSSTransition ? animation.transitionProperty : animation instanceof CSSAnimation ? animation.animationName : "script"}`;
      }),
  );
  expect(running).toEqual([]);
});

test("the index's canvas switches to the list, and remembers it", async ({ page }) => {
  await page.goto("/");
  const canvas = page.locator(".canvas");
  await expect(canvas).toHaveAttribute("data-view", "canvas");
  await page.getByRole("button", { name: "List", exact: true }).click();
  await expect(page.getByRole("link", { name: /Annotate/ }).first()).toBeVisible();
  await page.reload();
  await expect(canvas).toHaveAttribute("data-view", "list");
  await page.getByRole("button", { name: "Canvas", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-view", "canvas");
});

test("tabbing into the index's packages shows them as a list", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Read the docs" }).focus();
  await page.keyboard.press("Tab");
  await expect(page.locator(".canvas")).toHaveAttribute("data-view", "list");
  await expect(page.locator(".grid a").first()).toBeFocused();
});

test("hovering the rail shows every section's name over the pages, without moving them", async ({
  page,
}) => {
  await page.goto("/lint/");
  const label = page.locator(".sidebar .rail-label", { hasText: "Components" });
  const pages = page.locator(".sidebar .pages");
  await page.mouse.move(500, 0);
  const left = (await pages.boundingBox())?.x;
  await expect(label).toHaveCSS("opacity", "0");
  await page.locator(".sidebar .rail").hover();
  await expect(label).toHaveCSS("opacity", "1");
  expect((await pages.boundingBox())?.x).toBe(left);
  // Escape folds it back while the pointer is still over it.
  await page.locator(".sidebar .rail a").first().focus();
  await page.keyboard.press("Escape");
  await expect(label).toHaveCSS("opacity", "0");
});

test("the rail opens the badge builder and marks it, not the docs, on its page", async ({
  page,
}) => {
  await page.goto("/lint/");
  await page.locator(".sidebar .rail a", { hasText: "Badge builder" }).click();
  await expect(page).toHaveURL(/\/badges\/(\?|$)/);
  await expect(page.locator(".sidebar .rail [aria-current]")).toHaveText("Badge builder");
});

test("a package's card links to its docs without a copy control", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "List", exact: true }).click();
  const card = page.locator(".grid a", { has: page.getByText("GitHub", { exact: true }) });
  await expect(card).toHaveAttribute("href", "/github/");
  await expect(page.getByRole("button", { name: "Copy pnpm add comark-github" })).toHaveCount(0);
});

test("the GitHub HTML example keeps its explicit image width", async ({ page }) => {
  await page.goto("/github/");
  await expect(
    page.locator('main img[alt="Office correlations: ducks vs. bugs, r = 0.94"]'),
  ).toHaveAttribute("width", "480");
});

test("Getting started installs comark-ui, and a block's page ends with its own package instead", async ({
  page,
}) => {
  await page.goto("/getting-started/");
  const command = page.locator(".install code");
  await expect(command).toHaveText("pnpm add comark @comark/html comark-ui");
  await page.getByRole("button", { name: "npm", exact: true }).click();
  await expect(command).toHaveText("npm install comark @comark/html comark-ui");

  await page.goto("/carousel/");
  await expect(page.locator(".installer")).toHaveCount(0);
  await expect(page.locator(".sidebar .rail a[aria-current]")).toHaveText("Components");
  await expect(page.locator("main")).toContainText("pnpm add comark @comark/html comark-carousel");
});

test("no page scrolls sideways on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of [
    "/",
    "/guide/renderers/",
    "/guide/theming/",
    "/getting-started/",
    "/annotate/",
    "/charts/",
    "/embed/",
    "/github/",
    "/lint/vite-doctor/",
  ]) {
    await page.goto(path);
    const [scroll, width] = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.clientWidth,
    ]);
    expect(scroll, path).toBeLessThanOrEqual(width);
  }
});

test("the rule groups stay shut, but the one holding the current rule is open", async ({
  page,
}) => {
  await page.goto("/doctor/annotate/missing-src/");
  const column = page.locator(".sidebar .pages");
  await expect(column.locator(".nav-fold[open]")).toHaveCount(1);
  await expect(column.locator('a[aria-current="page"]')).toBeVisible();
  const core = column.locator(".nav-fold").filter({ hasText: "Core" });
  await expect(core.getByRole("link", { name: "unclosed-block" })).toBeHidden();
  await core.locator("summary").press("Enter");
  await expect(core.getByRole("link", { name: "unclosed-block" })).toBeVisible();
  const migration = column.locator(".nav-fold").filter({ hasText: "remark-to-comark" });
  await migration.locator("summary").click();
  await migration.getByRole("link", { name: "framework" }).click();
  await expect(page).toHaveURL(/\/remark-to-comark\/diagnostics\/#rtc0101$/);
  await expect(migration).toHaveAttribute("open", "");
  await expect(migration.locator('a[aria-current="location"]')).toHaveText("framework");
  await expect(migration.getByRole("link", { name: "framework" })).toBeInViewport();
  await expect(column.locator(".nav-fold[open]")).toHaveCount(1);

  await migration.getByRole("link", { name: "plugin", exact: true }).click();
  await expect(page).toHaveURL(/#rtc0102$/);
  await expect(migration.locator("a[aria-current]")).toHaveText("plugin");
  await page.goBack();
  await expect(migration.locator("a[aria-current]")).toHaveText("framework");

  await page.reload();
  await expect(migration).toHaveAttribute("open", "");
  await expect(migration.locator("a[aria-current]")).toHaveText("framework");
});
