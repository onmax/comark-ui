import { createHtmlRenderer } from "@comark/html";
import { expect, type Page, test } from "@playwright/test";
import annotate, { components as annotateComponents } from "../packages/annotate/src/html.ts";
import carousel, { components as carouselComponents } from "../packages/carousel/src/html.ts";
import zoom, { components as zoomComponents } from "../packages/zoom/src/html.ts";

const render = createHtmlRenderer({
  plugins: [annotate(), carousel(), zoom()],
  components: { ...annotateComponents, ...carouselComponents, ...zoomComponents },
});

// A page of the plugins' HTML, served at a path of the docs site so its images load.
async function fixture(page: Page, body: string) {
  await page.route("**/fixture/", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><meta charset="utf-8"><style>main{width:600px;margin:auto}img{max-width:100%}</style><main>${body}</main>`,
    }),
  );
  await page.goto("/fixture/");
}

const rect = (page: Page, selector: string) =>
  page.locator(selector).evaluate((node) => node.getBoundingClientRect().toJSON() as DOMRect);

test("an image zooms, and Escape, Back, and a click around it close it", async ({ page }) => {
  await page.goto("/zoom/");
  const image = page.locator("main img[data-zoom]").first();
  const dialog = page.locator(".cz-dialog");

  await image.click();
  await expect(dialog).toBeVisible();
  await expect(dialog).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(image).toBeFocused();

  await image.click();
  await expect(dialog).toBeVisible();
  await page.goBack();
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/\/zoom\/$/);

  await image.click();
  await expect(dialog).toBeVisible();
  await page.mouse.click(8, 400);
  await expect(dialog).toHaveCount(0);
});

test("opening and closing the zoom doesn't shift the page sideways", async ({ page }) => {
  await page.goto("/carousel/");
  await page.evaluate(() => {
    const shifts: number[] = [];
    Object.assign(window, { shifts });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries())
        shifts.push((entry as PerformanceEntry & { value: number }).value);
    }).observe({ type: "layout-shift" });
  });
  const heading = page.locator("h1");
  const left = await heading.evaluate((node) => node.getBoundingClientRect().left);

  await page.locator("main .cc-slide").first().click();
  await expect(page.locator(".cz-dialog")).toBeVisible();
  expect(await heading.evaluate((node) => node.getBoundingClientRect().left)).toBe(left);
  await page.keyboard.press("Escape");
  await expect(page.locator(".cz-dialog")).toHaveCount(0);
  expect(await heading.evaluate((node) => node.getBoundingClientRect().left)).toBe(left);
  expect(await page.evaluate(() => (window as Window & { shifts?: number[] }).shifts)).toEqual([]);
});

test("a zoomed table keeps its header row", async ({ page }) => {
  await page.goto("/zoom/");
  const block = page
    .locator("main .example-preview .cz")
    .filter({ has: page.locator("table") })
    .last();
  await block.scrollIntoViewIfNeeded();
  await block.click();
  await expect(page.locator(".cz-dialog th").first()).toHaveText("Attempt");
});

test("a zoomed block keeps its text styles, so it closes onto the original without a jump", async ({
  page,
}) => {
  await page.goto("/zoom/");
  const block = page
    .locator("main .example-preview .cz")
    .filter({ has: page.locator("table") })
    .last();
  await block.scrollIntoViewIfNeeded();
  const height = await block.evaluate((node) => (node as HTMLElement).offsetHeight);
  await block.click();
  const copy = page.locator(".cz-item > .cz");
  expect(await copy.evaluate((node) => (node as HTMLElement).offsetHeight)).toBe(height);
});

test("a zoom opened as another closes keeps scroll restoration off until it closes too", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/zoom/");
  const image = page.locator("main img[data-zoom]").first();
  await image.click();
  await image.evaluate((node) =>
    node.addEventListener("comark-zoom:close", () => (node as HTMLElement).click(), { once: true }),
  );
  await page.goBack();
  await expect(page.locator(".cz-dialog")).toBeVisible();
  await page.waitForTimeout(50);
  expect(await page.evaluate(() => history.scrollRestoration)).toBe("manual");
  await page.keyboard.press("Escape");
  await expect(page.locator(".cz-dialog")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => history.scrollRestoration)).toBe("auto");
});

test("a group leaves out the items in a closed tab, and its strip is a group", async ({ page }) => {
  const item = (title: string, src: string) =>
    `::zoom{group="tour" title="${title}"}\n![${title}](${src})\n::`;
  await fixture(
    page,
    await render(
      [
        item("Hidden before", "/before.png"),
        item("Hidden after", "/after.png"),
        item("Before", "/before.png"),
        item("After", "/after.png"),
      ].join("\n\n"),
    ),
  );
  // The first two go in a hidden wrapper, the way a closed tab hides its panel.
  await page.evaluate(() => {
    const wrapper = Object.assign(document.createElement("div"), { hidden: true });
    const items = document.querySelectorAll("[data-zoom-group='tour']");
    items[0]!.before(wrapper);
    wrapper.append(items[0]!, items[1]!);
  });
  await page.locator("[data-zoom-group='tour']").last().click();
  await expect(page.locator(".cz-count")).toHaveText("2 / 2");
  await expect(page.locator(".cz-strip")).toHaveAttribute("role", "group");
  await expect(page.locator(".cz-thumb")).toHaveCount(2);
  await expect(page.locator(".cz-thumb").nth(1)).toHaveAttribute("aria-current", "true");
});

test("grouped blocks stand apart, and their view fits the item between the arrows and centers each thumbnail", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 700, height: 900 });
  const item = (title: string, src: string) =>
    `::zoom{group="tour" title="${title}"}\n![${title}](${src})\n::`;
  await fixture(
    page,
    await render([item("Before", "/before.png"), item("Tall", "/dashboard.png")].join("\n\n")),
  );
  const blocks = page.locator("[data-zoom-group='tour']");
  const [first, second] = await blocks.evaluateAll((nodes) =>
    nodes.map((node) => node.getBoundingClientRect().toJSON() as DOMRect),
  );
  expect(second!.top - first!.bottom).toBeGreaterThanOrEqual(24);

  await blocks.first().click();
  await expect(page.locator(".cz-nav svg")).toHaveCount(2);
  const zoomed = await rect(page, ".cz-item");
  expect(zoomed.left).toBeGreaterThan((await rect(page, ".cz-prev")).right);
  expect(zoomed.right).toBeLessThan((await rect(page, ".cz-next")).left);
  const offsets = await page.locator(".cz-thumb").evaluateAll((thumbs) =>
    thumbs.map((thumb) => {
      const outer = thumb.getBoundingClientRect();
      const inner = thumb.firstElementChild!.getBoundingClientRect();
      return [
        inner.left + inner.width / 2 - (outer.left + outer.width / 2),
        inner.top + inner.height / 2 - (outer.top + outer.height / 2),
      ];
    }),
  );
  for (const offset of offsets.flat()) expect(Math.abs(offset)).toBeLessThan(1);
});

test("a zoomed block has the background behind it, so the page doesn't show between its rows", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await fixture(page, await render("::zoom\n| A | B |\n| - | - |\n| 1 | 2 |\n::"));
  await page.locator("main .cz").click();
  const copy = page.locator(".cz-item > .cz");
  await expect(copy).toHaveCSS("background-color", "rgb(255, 255, 255)");
});

test("data-zoom-src shows the page's image until the larger one loads, then fits it", async ({
  page,
}) => {
  let release = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route(
    (url) => url.searchParams.has("large"),
    async (route) => {
      await held;
      await route.continue();
    },
  );
  await fixture(
    page,
    await render(
      '![Wide](/before.png){data-zoom-src="/dashboard.png?large" srcset="/before.png 1x"}',
    ),
  );
  await page.locator("main img").click();
  const copy = page.locator(".cz-item img");
  await expect(copy).toHaveAttribute("src", "/before.png");
  expect(await copy.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBe(1280);

  // The larger file is taller for its width, so the copy has to shrink to stay on the stage.
  release();
  await expect(copy).toHaveAttribute("src", "/dashboard.png?large");
  await expect(copy).not.toHaveAttribute("srcset");
  const stage = await rect(page, ".cz-stage");
  await expect.poll(async () => (await rect(page, ".cz-item")).height).toBeLessThan(stage.height);
});

test("a group's strip shows the page's images and loads no larger file", async ({ page }) => {
  const large: string[] = [];
  page.on("request", (request) => {
    const { search } = new URL(request.url());
    if (search.includes("large")) large.push(search);
  });
  const image = (src: string, n: number) =>
    `![Item ${n}](${src}){data-zoom-group="g" data-zoom-src="${src}?large=${n}"}`;
  const images = [image("/before.png", 1), image("/after.png", 2), image("/dashboard.png", 3)];
  await fixture(page, await render(images.join("\n\n")));
  await page.locator("main img").first().click();
  await expect(page.locator(".cz-item img")).toHaveAttribute("src", "/before.png?large=1");
  const thumbs = page.locator(".cz-thumb img");
  await expect(thumbs).toHaveCount(3);
  expect(
    await thumbs.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("src"))),
  ).toEqual(["/before.png", "/after.png", "/dashboard.png"]);
  expect(large).toEqual(["?large=1"]);
});

test("an image zooms no larger than its natural size", async ({ page }) => {
  await page.route("**/small.svg", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"><rect width="100" height="50"/></svg>',
    }),
  );
  await page.route("**/medium.svg", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="150" height="75"><rect width="150" height="75"/></svg>',
    }),
  );
  await fixture(page, await render('![Small](/small.svg){width="50"}'));
  await page.locator("main img").click();
  await expect.poll(async () => Math.round((await rect(page, ".cz-item")).width)).toBe(100);
  await page.keyboard.press("Escape");
  await expect(page.locator(".cz-dialog")).toHaveCount(0);

  // A larger file stops at its own size too.
  await fixture(page, await render('![Small](/small.svg){width="50" data-zoom-src="/medium.svg"}'));
  await page.locator("main img").click();
  await expect(page.locator(".cz-item img")).toHaveAttribute("src", "/medium.svg");
  await expect.poll(async () => Math.round((await rect(page, ".cz-item")).width)).toBe(150);
});

test("data-zoom-aside shows a copy beside the item, and the events map copies to the page and back", async ({
  page,
}) => {
  await fixture(
    page,
    (await render("![Plain](/before.png)")) +
      '<figure class="shot"><img src="/before.png" alt="Chart" data-zoom tabindex="0" data-zoom-context=".shot" data-zoom-aside="figcaption"><figcaption><b>Sales</b> by week</figcaption></figure>',
  );
  await page.evaluate(() =>
    document.addEventListener("comark-zoom:open", ({ detail }) => {
      const caption = document.querySelector("figure.shot b")!;
      const copy = detail.copyOf(caption);
      Object.assign(window, {
        mapped: {
          content:
            detail.content.tagName === "IMG" && detail.originalOf(detail.content) === detail.item,
          aside: Boolean(copy && detail.aside?.contains(copy)),
          back: Boolean(copy && detail.originalOf(copy) === caption),
          outside: detail.copyOf(document.body),
        },
      });
    }),
  );
  await page.locator("figure.shot img").click();
  await expect(page.locator(".cz-aside b")).toHaveText("Sales");
  const [item, aside] = [await rect(page, ".cz-item"), await rect(page, ".cz-aside")];
  expect(aside.left).toBeGreaterThanOrEqual(item.right - 1);
  expect(await page.evaluate(() => (window as unknown as { mapped: unknown }).mapped)).toEqual({
    content: true,
    aside: true,
    back: true,
    outside: null,
  });
});

test("start() from the client entry adds its own styles", async ({ page }) => {
  const dist = new URL("../packages/zoom/dist/", import.meta.url);
  await page.route("**/client/*.mjs", (route) => {
    const file = new URL(route.request().url()).pathname.split("/").pop() ?? "";
    return route.fulfill({ contentType: "text/javascript", path: new URL(file, dist).pathname });
  });
  await fixture(page, '<img src="/before.png" alt="Plain" data-zoom tabindex="0">');
  await page.evaluate(async () => {
    const entry = "/client/client.mjs";
    const client = (await import(entry)) as { start: () => () => void };
    client.start();
  });
  await page.locator("main img").click();
  await expect(page.locator(".cz-dialog")).toHaveCSS("position", "fixed");
});
