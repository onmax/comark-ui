import { createHtmlRenderer } from "@comark/html";
import { expect, type Page, test } from "@playwright/test";
import annotate, { components as annotateComponents } from "../packages/annotate/src/html.ts";
import carousel, { components as carouselComponents } from "../packages/carousel/src/html.ts";
import zoom, { components as zoomComponents } from "../packages/zoom/src/html.ts";
import { fixture } from "./helpers.ts";

const render = createHtmlRenderer({
  plugins: [annotate(), carousel(), zoom()],
  components: { ...annotateComponents, ...carouselComponents, ...zoomComponents },
});

const image = "![Office correlations dashboard](/dashboard.png)";
const block = `::zoom{title="Deploy retry policy"}
| Attempt | Wait |
| --- | --- |
| 1 | 1 s |
| 2 | 4 s |
| 3 | Until the pigeons leave |
::`;

const rect = (page: Page, selector: string) =>
  page.locator(selector).evaluate((node) => node.getBoundingClientRect().toJSON() as DOMRect);

test("an image zooms, and Escape, Back, and a click around it close it", async ({ page }) => {
  await fixture(page, await render(image));
  const picture = page.locator("main img[data-zoom]").first();
  const dialog = page.locator(".cz-dialog");

  await picture.click();
  await expect(dialog).toBeVisible();
  await expect(dialog).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(picture).toBeFocused();

  await picture.click();
  await expect(dialog).toBeVisible();
  await page.goBack();
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/\/fixture\/$/);

  await picture.click();
  await expect(dialog).toBeVisible();
  await page.mouse.click(8, 400);
  await expect(dialog).toHaveCount(0);
});

test("opening and closing the zoom doesn't shift the page sideways", async ({ page }) => {
  await fixture(
    page,
    await render(
      `# Carousel\n\n::carousel{title="Filters"}\n![Filter toolbar wrapping](/before.png)\n\n![Filter toolbar on one row](/after.png)\n\n![Office correlations dashboard](/dashboard.png)\n::\n\n${"Pigeons home from far away. ".repeat(400)}`,
    ),
  );
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
  await fixture(page, await render(block));
  await page
    .locator("main .cz")
    .filter({ has: page.locator("table") })
    .click();
  await expect(page.locator(".cz-dialog th").first()).toHaveText("Attempt");
});

test("a zoomed block keeps its text styles, so it closes onto the original without a jump", async ({
  page,
}) => {
  await fixture(
    page,
    await render(block),
    "main{width:600px;margin:auto;font:20px/1.7 Georgia,serif;letter-spacing:.03em}",
  );
  const zoomable = page.locator("main .cz").filter({ has: page.locator("table") });
  const height = await zoomable.evaluate((node) => (node as HTMLElement).offsetHeight);
  await zoomable.click();
  const copy = page.locator(".cz-item > .cz");
  expect(await copy.evaluate((node) => (node as HTMLElement).offsetHeight)).toBe(height);
});

test("a zoom opened as another closes keeps scroll restoration off until it closes too", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await fixture(page, await render(image));
  const picture = page.locator("main img[data-zoom]").first();
  await picture.click();
  await picture.evaluate((node) =>
    node.addEventListener("comark-zoom:close", () => (node as HTMLElement).click(), { once: true }),
  );
  await page.goBack();
  await expect(page.locator(".cz-dialog")).toBeVisible();
  await expect.poll(() => page.evaluate(() => history.scrollRestoration)).toBe("manual");
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

test("the copy isn't cut off by the aside's column on its way to the page and back", async ({
  page,
}) => {
  await fixture(
    page,
    (await render("![Plain](/before.png)")) +
      '<figure class="shot"><img src="/before.png" alt="Chart" data-zoom tabindex="0" data-zoom-context=".shot" data-zoom-aside="figcaption"><figcaption>Sales by week</figcaption></figure>',
    "main{width:1200px;margin:auto}img{width:1100px}",
  );
  const picture = page.locator("figure.shot img");
  const item = await rect(page, "figure.shot img");
  // Freezes every animation at its start, where the copy covers the item, or its end, where it's back over it.
  const freeze = (at: "start" | "end") =>
    page.evaluate((at) => {
      for (const animation of document.getAnimations()) {
        animation.pause();
        animation.currentTime = at === "start" ? 0 : 199;
      }
    }, at);
  // The item's right part lies over the aside's column, past the stage.
  const hit = () =>
    page.evaluate(
      ([x, y]) => Boolean(document.elementFromPoint(x!, y!)?.closest(".cz-item")),
      [item.right - 20, item.top + item.height / 2],
    );
  expect(item.right).toBeGreaterThan((await page.viewportSize())!.width - 352);

  await picture.click();
  await expect(page.locator(".cz-aside")).toHaveText("Sales by week");
  await freeze("start");
  expect(await hit()).toBe(true);
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) animation.finish();
  });

  await page.keyboard.press("Escape");
  await freeze("end");
  expect(await hit()).toBe(true);
});

for (const time of [0, 130, 259]) {
  test(`a copy closes from where it is at ${time}ms into opening`, async ({ page }) => {
    const rows = Array.from({ length: 80 }, (_, index) => `| ${index + 1} | ${index * 2} s |`);
    await fixture(
      page,
      await render(`::zoom\n| Attempt | Wait |\n| --- | --- |\n${rows.join("\n")}\n::`),
    );
    // Open and pause in one task so even the last frame still has its overflow compensation.
    await page.locator("main .cz").evaluate((node, time) => {
      (node as HTMLElement).click();
      for (const animation of document.getAnimations()) {
        animation.pause();
        animation.currentTime = time;
      }
    }, time);
    await expect(page.locator(".cz-stage[data-scroll][data-flying]")).toHaveCount(1);
    const before = await rect(page, ".cz-item");

    await page.keyboard.press("Escape");
    await page.evaluate(() => {
      for (const animation of document.getAnimations()) {
        animation.pause();
        animation.currentTime = 0;
      }
    });
    const after = await rect(page, ".cz-item");
    expect(Math.round(after.top)).toBe(Math.round(before.top));
    expect(Math.round(after.left)).toBe(Math.round(before.left));
  });
}

test("a scrolled copy closes from where it is", async ({ page }) => {
  const rows = Array.from({ length: 80 }, (_, index) => `| ${index + 1} | ${index * 2} s |`);
  await fixture(
    page,
    await render(`::zoom\n| Attempt | Wait |\n| --- | --- |\n${rows.join("\n")}\n::`),
  );
  await page.locator("main .cz").click();
  await expect(page.locator(".cz-stage[data-scroll]")).toHaveCount(1);
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) animation.finish();
    document.querySelector(".cz-stage")!.scrollTop = 400;
  });
  const before = await rect(page, ".cz-item");
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) {
      animation.pause();
      animation.currentTime = 0;
    }
  });
  const after = await rect(page, ".cz-item");
  expect(Math.round(after.top)).toBe(Math.round(before.top));
  expect(Math.round(after.left)).toBe(Math.round(before.left));
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

test("the events carry the zoomed copy's scale, which follows a resize", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.route("**/wide.svg", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="1200"><rect width="2400" height="1200"/></svg>',
    }),
  );
  await fixture(page, await render('![Wide](/wide.svg){width="300"}'));
  await page.evaluate(() =>
    document.addEventListener("comark-zoom:open", ({ detail }) =>
      Object.assign(window, { detail }),
    ),
  );
  await page.locator("main img").click();
  await expect(page.locator(".cz-dialog")).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0);
  // What the layer's box on screen says it's scaled by, against what the event says.
  const scales = () =>
    page.evaluate(() => {
      const { detail } = window as unknown as { detail: { layer: HTMLElement; scale: number } };
      return {
        shown: detail.layer.getBoundingClientRect().width / detail.layer.offsetWidth,
        said: detail.scale,
      };
    });
  const before = await scales();
  expect(before.said).toBeGreaterThan(1);
  expect(before.said).toBeCloseTo(before.shown, 2);
  await page.setViewportSize({ width: 800, height: 600 });
  await expect.poll(async () => (await scales()).said).toBeLessThan(before.said);
  const after = await scales();
  expect(after.said).toBeCloseTo(after.shown, 2);
});

test("an item taller than the stage fills its width and scrolls instead of shrinking", async ({
  page,
}) => {
  await page.route("**/tall.svg", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="4800"><rect width="1200" height="4800" fill="#ddd"/><rect y="4700" width="1200" height="100" fill="#c00"/></svg>',
    }),
  );
  await fixture(page, await render("![Full page](/tall.svg)"));
  const picture = page.locator("main img");
  const before = await rect(page, "main img");
  await picture.click();
  await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0);

  const stage = await rect(page, ".cz-stage");
  const copy = await rect(page, ".cz-item");
  expect(copy.width).toBeGreaterThan(before.width);
  expect(copy.top).toBeGreaterThanOrEqual(stage.top);
  expect(copy.top).toBeLessThan(stage.top + stage.height / 2);

  // Scrolled to the end, the copy's bottom shows on the stage.
  await page.locator(".cz-stage").evaluate((node) => (node.scrollTop = node.scrollHeight));
  const end = await rect(page, ".cz-item");
  expect(end.bottom).toBeLessThanOrEqual(stage.bottom);
  expect(end.bottom).toBeGreaterThan(stage.bottom - stage.height * 0.1);

  await page.keyboard.press("Escape");
  await expect(page.locator(".cz-dialog")).toHaveCount(0);
});

test("resizing a scrolled tall item preserves its content position and clears scrolling when it fits", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1000, height: 800 });
  await page.route("**/tall.svg", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="4800"><rect width="1200" height="4800"/></svg>',
    }),
  );
  await fixture(
    page,
    await render("![Full page](/tall.svg)"),
    "main{width:min(600px,90vw);margin:auto}img{max-width:100%}",
  );
  await page.locator("main img").click();
  const stage = page.locator(".cz-stage");
  await expect(stage).toHaveAttribute("data-scroll");
  await stage.evaluate((node) => (node.scrollTop = (node.scrollHeight - node.clientHeight) / 2));
  // Compare the source-image coordinate at the stage's top, independent of the page width and zoom scale.
  const sourceTop = () =>
    page.locator(".cz-item img").evaluate((node: HTMLImageElement) => {
      const image = node.getBoundingClientRect();
      const stage = node.closest(".cz-stage")!.getBoundingClientRect();
      return ((stage.top - image.top) / image.width) * node.naturalWidth;
    });
  const before = await sourceTop();
  expect(before).toBeGreaterThan(1000);
  await page.setViewportSize({ width: 500, height: 900 });
  await expect(stage).toHaveAttribute("data-scroll");
  await expect.poll(async () => Math.abs((await sourceTop()) - before)).toBeLessThan(3);

  await page.setViewportSize({ width: 400, height: 1800 });
  await expect(stage).not.toHaveAttribute("data-scroll");
  await expect.poll(() => stage.evaluate((node) => node.scrollTop)).toBe(0);
  const fitted = await rect(page, ".cz-item");
  const box = await rect(page, ".cz-stage");
  expect(fitted.top).toBeGreaterThanOrEqual(box.top);
  expect(fitted.bottom).toBeLessThanOrEqual(box.bottom);
  expect((fitted.top + fitted.bottom) / 2).toBeCloseTo((box.top + box.bottom) / 2, 0);
});

for (const tall of [true, false]) {
  test(`loading a replacement image ${tall ? "preserves a tall item's content position" : "clears scrolling when it fits"}`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 2000, height: 800 });
    let release = () => {};
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route("**/tall.svg", (route) =>
      route.fulfill({
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="4800"><rect width="1200" height="4800"/></svg>',
      }),
    );
    await page.route("**/replacement.svg", async (route) => {
      await held;
      const height = tall ? 6400 : 400;
      await route.fulfill({
        contentType: "image/svg+xml",
        body: `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="${height}"><rect width="1600" height="${height}"/></svg>`,
      });
    });
    await fixture(page, await render('![Full page](/tall.svg){data-zoom-src="/replacement.svg"}'));
    await page.locator("main img").click();
    const stage = page.locator(".cz-stage");
    await expect(stage).toHaveAttribute("data-scroll");
    await stage.evaluate((node) => (node.scrollTop = (node.scrollHeight - node.clientHeight) / 2));
    const position = () =>
      page.locator(".cz-item img").evaluate((node) => {
        const image = node.getBoundingClientRect();
        return (node.closest(".cz-stage")!.getBoundingClientRect().top - image.top) / image.width;
      });
    const before = await position();
    expect(before).toBeGreaterThan(1);
    release();
    await expect(page.locator(".cz-item img")).toHaveAttribute("src", "/replacement.svg");
    await expect(page.locator(".cz-item img")).toHaveJSProperty("naturalWidth", 1600);
    if (tall) {
      await expect(stage).toHaveAttribute("data-scroll");
      await expect.poll(async () => (await rect(page, ".cz-item")).width).toBeCloseTo(1600, 0);
      await expect.poll(async () => Math.abs((await position()) - before)).toBeLessThan(0.003);
    } else {
      await expect(stage).not.toHaveAttribute("data-scroll");
      await expect.poll(() => stage.evaluate((node) => node.scrollTop)).toBe(0);
      const fitted = await rect(page, ".cz-item");
      const box = await rect(page, ".cz-stage");
      expect((fitted.top + fitted.bottom) / 2).toBeCloseTo((box.top + box.bottom) / 2, 0);
    }
  });
}

test("figure navigation counts interleaved named groups at their first item", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const item = (title: string, group = "") =>
    `::zoom{title="${title}"${group ? ` group="${group}"` : ""}}\n${title}\n::`;
  await fixture(
    page,
    await render(
      [
        item("First A", "a"),
        item("First B", "b"),
        item("Middle"),
        item("Second A", "a"),
        item("Second B", "b"),
        item("Last"),
      ].join("\n\n"),
    ),
  );
  const place = page.locator(".cz-place");
  const title = page.locator(".cz-title");
  await page.locator("main [data-zoom]").first().click();
  await expect(place).toHaveText("Figure 1 of 4");
  await page.keyboard.press("ArrowUp");
  await expect(title).toHaveText("First A");
  await page.keyboard.press("ArrowRight");
  await expect(title).toHaveText("Second A");
  await expect(place).toHaveText("Figure 1 of 4");

  for (const [index, name] of ["First B", "Middle", "Last"].entries()) {
    await page.keyboard.press("ArrowDown");
    await expect(title).toHaveText(name);
    await expect(place).toHaveText(`Figure ${index + 2} of 4`);
  }
  await page.keyboard.press("ArrowDown");
  await expect(title).toHaveText("Last");

  for (const [index, name] of ["Middle", "First B", "First A"].entries()) {
    await page.keyboard.press("ArrowUp");
    await expect(title).toHaveText(name);
    await expect(place).toHaveText(`Figure ${3 - index} of 4`);
  }
  await page.keyboard.press("Escape");
  await expect(page.locator(".cz-dialog")).toHaveCount(0);
  await expect(page.locator("main [data-zoom]").first()).toBeFocused();
});

test("Up and Down move between the page's figures, scroll a tall one first, and leave a slider its keys", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/tall.svg", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="4800"><rect width="1200" height="4800" fill="#ddd"/></svg>',
    }),
  );
  const pair = (mode = "") => `::compare{${mode}}
:::screenshot{src="/before.png" alt="Before" viewport="640x250"}
:::

:::screenshot{src="/after.png" alt="After" viewport="640x250"}
:::
::`;
  const filler = "Pigeons home from far away. ".repeat(200);
  await fixture(
    page,
    await render(
      [
        image,
        filler,
        pair(),
        filler,
        pair('mode="slider"'),
        filler,
        "![Full page](/tall.svg)",
      ].join("\n\n"),
    ),
  );
  const dialog = page.locator(".cz-dialog");
  const place = page.locator(".cz-place");
  await page.locator("main img[data-zoom]").first().click();
  await expect(place).toHaveText("Figure 1 of 4");

  await page.keyboard.press("ArrowDown");
  await expect(place).toHaveText("Figure 2 of 4");
  await expect(page.locator(".cz-count")).toHaveText("1 / 2");
  await expect(page.locator(".cz-title")).toHaveText("Before");
  await expect(page.locator(".cz-thumb")).toHaveCount(2);
  await expect(page.locator(".cz-nav")).toHaveCount(2);
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".cz-title")).toHaveText("After");

  // A slider keeps Up and Down for its divider.
  await page.keyboard.press("ArrowDown");
  await expect(place).toHaveText("Figure 3 of 4");
  const handle = page.locator(".cz-item .ca-handle");
  await handle.focus();
  await page.keyboard.press("ArrowUp");
  await expect(handle).toHaveAttribute("aria-valuenow", "55");
  await expect(place).toHaveText("Figure 3 of 4");
  await dialog.focus();

  // A tall figure scrolls to its end before Down moves on, and the last figure doesn't wrap.
  await page.keyboard.press("ArrowDown");
  await expect(place).toHaveText("Figure 4 of 4");
  await expect(page.locator(".cz-nav")).toHaveCount(0);
  const stage = page.locator(".cz-stage");
  await page.keyboard.press("ArrowDown");
  await expect.poll(() => stage.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
  await stage.evaluate((node) => (node.scrollTop = node.scrollHeight));
  await page.keyboard.press("ArrowDown");
  await expect(place).toHaveText("Figure 4 of 4");

  await stage.evaluate((node) => (node.scrollTop = 0));
  // Back up to the first comparison, then close: the page has scrolled to it and focus lands on it.
  await page.keyboard.press("ArrowUp");
  await expect(place).toHaveText("Figure 3 of 4");
  await page.keyboard.press("ArrowUp");
  await expect(place).toHaveText("Figure 2 of 4");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  const first = page.locator("main [data-zoom-gallery] [data-zoom]").first();
  await expect(first).toBeInViewport();
});
