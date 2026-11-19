import { readFile } from "node:fs/promises";
import { createHtmlRenderer } from "@comark/html";
import { expect, type Page, test } from "@playwright/test";
import annotate, { components } from "../packages/annotate/src/html.ts";
import { fixture } from "./helpers.ts";

const render = createHtmlRenderer({ plugins: [annotate()], components });
// The annotate docs' examples, on a page as wide as the docs' column.
const open = async (page: Page, markdown: string) =>
  fixture(page, await render(markdown), "main{width:46rem;margin:2rem auto}");

const compare = `::compare
:::screenshot{src="/before.png" alt="Filter toolbar wrapping onto a second row" viewport="640x250"}
::::annotation{x=4.5 y=28.7 w=90.9 h=44.4 color="red"}
Moon phase and vibes don't fit, so the toolbar wraps and pushes the table down.
::::

::::annotation{x=22.4 y=50.4 w=13.3 h=20.6 mark="circle" color="red"}
**Apply** sits 6px lower than the chips.
::::
:::

:::screenshot{src="/after.png" alt="Filter toolbar on one row" viewport="640x250"}
::::annotation{x=68 y=33.1 w=13.3 h=16 mark="highlight" color="blue"}
Moon phase and vibes collapse into **+2 filters**.
::::

::::annotation{x=82.5 y=33.1 w=10.9 h=16 mark="check" color="green"}
**Apply** lines up with the chips.
::::
:::
::`;

test("a comparison lines up its screenshots and zooms them with their marks and colors, and their notes beside them", async ({
  page,
}) => {
  await open(page, compare);
  const figure = page.locator("main .ca-compare").first();
  const tops = await figure
    .locator(".ca-frame img")
    .evaluateAll((images) => images.map((image) => Math.round(image.getBoundingClientRect().top)));
  expect(new Set(tops).size).toBe(1);

  const mark = figure.locator(".ca-mark").first();
  const color = await mark.evaluate((node) => getComputedStyle(node).color);
  await mark.click({ force: true });
  const zoomed = page.locator(".cz-item .ca-mark").first();
  await expect(zoomed).toBeVisible();
  await expect(zoomed).toHaveCSS("color", color);
  await expect(page.locator(".cz-count")).toHaveText("1 / 2");

  // The notes sit beside the zoomed screenshot, and a mark lights up its note there too.
  const note = page.locator(".cz-aside .ca-notes li").first();
  await expect(note).toBeVisible();
  // Measured once the zoom has finished opening, since its frame scales in.
  await page.waitForFunction(() =>
    document
      .querySelector(".cz-dialog")!
      .getAnimations({ subtree: true })
      .every((animation) => animation.playState !== "running"),
  );
  const aside = await page.locator(".cz-aside").boundingBox();
  const frame = await page.locator(".cz-item .ca-frame").boundingBox();
  expect(aside!.x).toBeGreaterThanOrEqual(frame!.x + frame!.width - 1);
  // Marks can overlap, so the note is the one to point at.
  await note.hover();
  await expect(page.locator('.cz-item .ca-mark[data-n="1"]')).toHaveCSS("--ca-on", "1");
  // The thumbnails are copies too, and stay out of it.
  await expect(page.locator('.cz-thumb .ca-mark[data-n="1"]').first()).not.toHaveCSS(
    "--ca-on",
    "1",
  );
});

test("the zoom maps its copies to the page and back", async ({ page }) => {
  await open(page, compare);
  await page.evaluate(() => {
    const checkMapping = (event: DocumentEventMap["comark-zoom:open"]) => {
      const { content, aside, header, copyOf, originalOf } = event.detail;
      const image = content.querySelector(".ca-frame img")!;
      const note = aside!.querySelector(".ca-notes li")!;
      const toggle = header.querySelector(".ca-hide input")!;
      const originalToggle = event.detail.item.querySelector(".ca-hide input")!;
      const figure = event.detail.item.closest(".ca-screenshot")!;
      Object.assign(window, {
        mapped: {
          index: event.detail.index,
          content: content.matches(".ca-stage"),
          image: originalOf(image) === event.detail.item.querySelector(".ca-frame img"),
          back: copyOf(originalOf(image)!) === image,
          note: originalOf(note) === figure.querySelector(".ca-notes li"),
          toggle: copyOf(originalToggle) === toggle && originalOf(toggle) === originalToggle,
          outside: originalOf(document.body),
        },
      });
    };
    document.addEventListener("comark-zoom:open", checkMapping);
    document.addEventListener("comark-zoom:change", checkMapping);
  });
  await page.locator("main .ca-compare .ca-stage").first().click();
  await expect(page.locator(".cz-dialog")).toBeVisible();
  const mapped = () => page.evaluate(() => (window as unknown as { mapped: unknown }).mapped);
  const expected = {
    content: true,
    image: true,
    back: true,
    note: true,
    toggle: true,
    outside: null,
  };
  expect(await mapped()).toEqual({ ...expected, index: 0 });
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".cz-count")).toHaveText("2 / 2");
  expect(await mapped()).toEqual({ ...expected, index: 1 });
});

test("the entire Hide marks button stays above a scrolling zoom stage", async ({ page }) => {
  await page.setViewportSize({ width: 700, height: 600 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/tall.svg", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="1000"><rect width="400" height="1000" fill="white"/></svg>',
    }),
  );
  await open(
    page,
    `::screenshot{src="/tall.svg" alt="Dashboard" viewport="400x1000"}
:::annotation{x=80 y=2 w=18 h=8}
The top right corner.
:::
::`,
  );
  await page.locator("main .ca-stage").click();
  const stage = page.locator(".cz-stage[data-scroll]");
  await expect(stage).toBeVisible();
  await stage.evaluate((node) => (node.scrollTop = node.scrollHeight));
  expect(await stage.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);

  const hide = page.locator(".cz-header .ca-hide");
  const button = (await hide.boundingBox())!;
  expect(button.y + button.height).toBeLessThanOrEqual((await stage.boundingBox())!.y);
  await page.mouse.click(button.x + button.width / 2, button.y + button.height - 1);
  await expect(hide.locator("input")).toBeChecked();
  await expect(page.locator(".cz-item .ca-mark")).toBeHidden();
});

test("a host's `.ca` rule sets the default mark color, on the page and zoomed", async ({
  page,
}) => {
  await open(
    page,
    `::screenshot{src="/after.png" alt="Filter toolbar on one row" title="After" href="https://pr42.preview.example.com/plan"}
:::annotation{x=67.9 y=34.8 w=13 h=14.2}
Extra filters collapse into **+2 filters**.
:::
::`,
  );
  await page.addStyleTag({ content: ".ca{--ca-color:rgb(1, 2, 3)}" });
  const plain = ".ca-mark:not([style*='--ca-color'])";
  const mark = page.locator(`main ${plain}:visible`).first();
  await expect(mark).toHaveCSS("color", "rgb(1, 2, 3)");
  await mark.click({ force: true });
  await expect(page.locator(`.cz-item ${plain}`).first()).toHaveCSS("color", "rgb(1, 2, 3)");
});

test("a box frames its area 6px out on a host that sets every element's box-sizing", async ({
  page,
}) => {
  await open(
    page,
    `::screenshot{src="/after.png" alt="Filter toolbar on one row"}
:::annotation{x=40 y=30 w=20 h=20}
The filters.
:::
::`,
  );
  // An unlayered reset beats the comark layer's rules, whatever their specificity.
  await page.addStyleTag({ content: "*{box-sizing:border-box}" });
  const image = await page.locator("main .ca-frame img").boundingBox();
  const mark = await page.locator("main .ca-mark.ca-box").boundingBox();
  if (!image || !mark) throw new Error("The screenshot or its box didn't render.");
  expect(mark.x).toBeCloseTo(image.x + image.width * 0.4 - 6, 0);
  expect(mark.y).toBeCloseTo(image.y + image.height * 0.3 - 6, 0);
  expect(mark.width).toBeCloseTo(image.width * 0.2 + 12, 0);
  expect(mark.height).toBeCloseTo(image.height * 0.2 + 12, 0);
});

test("a side note lines up with its arrow when the screenshot also has a note above it", async ({
  page,
}) => {
  await open(
    page,
    `::screenshot{src="/dashboard.png" alt="Office correlations dashboard"}
:::annotation{x=37 y=33.1 w=16.4 h=5.2 mark="none" side="top"}
Bugs fixed fell with the duck supply.
:::

:::annotation{x=66.1 y=17 w=30.5 h=24.6 mark="none" side="top"}
r now counts the office cat.
:::

:::annotation{x=4 y=77.3 w=92 h=8.2 mark="none" side="left"}
The pigeons ate week 15.
:::
::`,
  );
  const figure = page.locator("main .ca-screenshot.ca-top.ca-left:visible").first();
  await figure.locator(".ca-frame > img").evaluate((image) => (image as HTMLImageElement).decode());
  const middle = (selector: string) =>
    figure.locator(selector).evaluate((node) => {
      const { top, height } = node.getBoundingClientRect();
      return top + height / 2;
    });
  const note = await middle(".ca-callout-left");
  expect(Math.abs(note - (await middle(".ca-arrow-left")))).toBeLessThan(2);
});

test("a slider moves its divider by drag and by key, and a click without a drag zooms it", async ({
  page,
}) => {
  await open(
    page,
    `::compare{mode="slider"}
:::screenshot{src="/before.png" alt="Filter toolbar wrapping onto a second row" viewport="640x250"}
::::annotation{x=22.4 y=50.4 w=13.3 h=20.6 mark="circle" color="red"}
**Apply** sits 6px lower than the chips.
::::
:::

:::screenshot{src="/after.png" alt="Filter toolbar on one row" viewport="640x250"}
::::annotation{x=82.5 y=33.1 w=10.9 h=16 mark="check" color="green"}
**Apply** lines up with the chips.
::::
:::
::`,
  );
  const swipe = page.locator("main .ca-swipe:visible").first();
  const handle = swipe.locator(".ca-handle");
  await expect(handle).toHaveAttribute("aria-valuenow", "50");

  const box = (await swipe.boundingBox())!;
  const y = box.y + box.height * 0.6;
  await page.mouse.move(box.x + box.width * 0.5, y);
  await page.mouse.down();
  for (let step = 1; step <= 10; step++)
    await page.mouse.move(box.x + box.width * (0.5 - 0.025 * step), y);
  await page.mouse.up();
  await expect(handle).toHaveAttribute("aria-valuenow", "25");
  await expect(handle).toHaveAttribute("aria-valuetext", "Before 25%, After 75%");
  // The click that ends a drag doesn't zoom.
  await expect(page.locator(".cz-dialog")).toHaveCount(0);

  await handle.focus();
  await page.keyboard.press("End");
  await page.keyboard.press("ArrowLeft");
  await expect(handle).toHaveAttribute("aria-valuenow", "95");

  await swipe.locator(".ca-grip").click();
  await expect(page.locator(".cz-dialog")).toHaveCount(0);

  // Focusing and clicking the handle can scroll the page, so measure the pair again.
  const now = (await swipe.boundingBox())!;
  await page.mouse.click(now.x + now.width * 0.3, now.y + now.height * 0.6);
  await expect(page.locator(".cz-item .ca-swipe")).toBeVisible();
  const zoomed = page.locator(".cz-item .ca-handle");
  await expect(zoomed).toHaveAttribute("aria-valuenow", "95");
  await zoomed.focus();
  await page.keyboard.press("Home");
  await expect(zoomed).toHaveAttribute("aria-valuenow", "0");
});

test("Copy puts a screenshot on the clipboard with its marks, and a right-click on the image finds the same copy", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page, compare);
  const figure = page
    .locator("main .ca-screenshot:visible")
    .filter({ has: page.locator(".ca-mark .ca-stamp") })
    .first();
  await figure.hover();
  await expect(figure.locator(".ca-overlay")).toHaveAttribute("src", /^blob:/);
  await figure.locator(".ca-copy").click();
  await expect(figure.locator(".ca-copy-status")).toHaveText("Copied");

  // The copy holds the figure with a margin, so the first stamp's color is where the stamp sits on the page.
  const [copied, expected] = await figure.evaluate(async (node) => {
    const [item] = await navigator.clipboard.read();
    const bitmap = await createImageBitmap(await item!.getType("image/png"));
    const box = node.getBoundingClientRect();
    const stamp = node.querySelector(".ca-mark .ca-stamp")!;
    const at = stamp.getBoundingClientRect();
    const scale = bitmap.width / (box.width + 32);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d")!;
    context.drawImage(bitmap, 0, 0);
    const x = Math.round((at.left + at.width / 2 - box.left + 16) * scale);
    const y = Math.round((at.top + 2 - box.top + 16) * scale);
    const pixel = [...context.getImageData(x, y, 1, 1).data].slice(0, 3);
    context.fillStyle = getComputedStyle(stamp).backgroundColor;
    context.fillRect(0, 0, 1, 1);
    return [pixel, [...context.getImageData(0, 0, 1, 1).data].slice(0, 3)];
  });
  for (const [index, channel] of copied.entries())
    expect(Math.abs(channel - expected[index]!)).toBeLessThan(24);

  // The first right-click hits the frame, which arms the invisible copy before
  // the browser dispatches contextmenu to that copy.
  await figure.locator(".ca-frame").evaluate((frame) => {
    frame.addEventListener(
      "contextmenu",
      (event) => {
        const target = event.target as Element;
        const state = window as typeof window & {
          __annotateContextTarget?: string;
          __annotateContextArmed?: boolean;
        };
        state.__annotateContextTarget = target.className;
        state.__annotateContextArmed = target.matches(".ca-overlay[data-menu]");
        (event.target as HTMLElement).click();
      },
      { once: true },
    );
  });
  const frame = figure.locator(".ca-frame");
  await frame.click({ button: "right" });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const state = window as typeof window & {
          __annotateContextTarget?: string;
          __annotateContextArmed?: boolean;
        };
        return [state.__annotateContextTarget, state.__annotateContextArmed];
      }),
    )
    .toEqual(["ca-overlay", true]);
  await expect(page.locator(".cz-dialog")).toBeVisible();
  await page.keyboard.press("ControlOrMeta+c");
  await expect(page.locator(".cz-header .ca-copy-status")).toHaveText("Copied");
});

for (const modifier of ["Control", "Meta"]) {
  test(`${modifier}+C copies the screenshot reached by Tab with its notes`, async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await open(
      page,
      `::screenshot{src="/before.png" alt="Filter toolbar" viewport="640x250"}
:::annotation{x=4.5 y=28.7 w=90.9 h=44.4 color="red"}
The toolbar wraps.
:::
::`,
    );
    await page.keyboard.press("Tab");
    const figure = page.locator("main .ca-screenshot");
    await expect(figure.locator(".ca-stage")).toBeFocused();
    await page.evaluate(() => navigator.clipboard.writeText("before copying"));
    await page.keyboard.press(`${modifier}+c`);
    // Chromium can defer PNG encoding under load; wait for the completed write before reading it.
    await expect(figure.locator(".ca-copy-status")).toHaveText("Copied", { timeout: 15_000 });
    const copiedHeight = await page.evaluate(async () => {
      const [item] = await navigator.clipboard.read();
      const bitmap = await createImageBitmap(await item!.getType("image/png"));
      return bitmap.height;
    });
    const stage = await figure.locator(".ca-stage").boundingBox();
    expect(copiedHeight).toBeGreaterThan(
      stage!.height * (await page.evaluate(() => devicePixelRatio)),
    );
    await expect(page.locator(".cz-dialog")).toHaveCount(0);
  });
}

test("a zoomed screenshot's Copy sits in the header before Close, clear of the image and its marks", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const body =
    await render(`::screenshot{src="/fixture/shot.png" alt="Dashboard" viewport="1280x800"}
:::annotation{x=80 y=2 w=18 h=8 mark="box" color="red"}
The top right corner.
:::
::`);
  const shot = await readFile(new URL("../docs/public/dashboard.png", import.meta.url));
  await page.route("**/fixture/shot.png", (route) =>
    route.fulfill({ contentType: "image/png", body: shot }),
  );
  await page.route("**/fixture/", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><meta charset="utf-8"><style>main{width:720px;padding:80px}</style><main>${body}</main>`,
    }),
  );
  await page.goto("/fixture/", { waitUntil: "domcontentloaded" });
  await page.locator(".ca-screenshot .ca-stage").first().click();
  await expect(page.locator(".cz-dialog")).toBeVisible();

  const copy = page.locator(".cz-header .ca-zoom-tools .ca-copy");
  await expect(copy).toBeVisible();
  await expect(page.locator(".cz-header .ca-zoom-tools .ca-hide")).toBeVisible();
  await expect(page.locator(".cz-item :is(.ca-copy,.ca-copy-status,.ca-hide)")).toHaveCount(0);
  expect(
    await page
      .locator(".cz-header")
      .evaluate((header) => [...header.children].map((child) => child.className).slice(-2)),
  ).toEqual(["ca-zoom-tools", "cz-close"]);
  const frame = await page.locator(".cz-item .ca-frame").boundingBox();
  for (const part of [copy, page.locator(".cz-header .ca-hide")]) {
    const button = await part.boundingBox();
    expect(button!.y + button!.height).toBeLessThanOrEqual(frame!.y);
  }

  await copy.click();
  await expect(copy).toHaveAttribute("data-state", "done");
  await expect(page.locator(".cz-header .ca-copy-status")).toHaveText("Copied");
  const size = await page.evaluate(async () => {
    const [item] = await navigator.clipboard.read();
    const bitmap = await createImageBitmap(await item!.getType("image/png"));
    return bitmap.width;
  });
  expect(size).toBeGreaterThan(0);
});

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 320, height: 568 },
  { width: 844, height: 390 },
]) {
  for (const failure of ["clipboard", "CORS"]) {
    test(`zoomed Copy keeps ${failure} failure feedback in the header at ${viewport.width}x${viewport.height}`, async ({
      page,
      context,
    }) => {
      await page.setViewportSize(viewport);
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      if (failure === "clipboard") {
        await page.addInitScript(() => {
          navigator.clipboard.write = async (items) => {
            await items[0]!.getType("image/png");
            throw new DOMException("Clipboard access denied", "NotAllowedError");
          };
        });
      }
      const src = failure === "CORS" ? "https://screenshots.example/shot.png" : "/fixture/shot.png";
      const body = await render(`::screenshot{src="${src}" alt="Dashboard" viewport="1280x800"}
:::annotation{x=80 y=2 w=18 h=8 mark="box" color="red"}
The top right corner.
:::
::`);
      const shot = await readFile(new URL("../docs/public/dashboard.png", import.meta.url));
      await page.route("**/shot.png", (route) =>
        route.fulfill({
          contentType: "image/png",
          headers: { "access-control-allow-origin": "https://another-site.example" },
          body: shot,
        }),
      );
      await page.route("**/fixture/", (route) =>
        route.fulfill({
          contentType: "text/html",
          body: `<!doctype html><meta charset="utf-8"><style>main{max-width:720px;margin:auto}</style><main>${body}</main>`,
        }),
      );
      await page.goto("/fixture/", { waitUntil: "domcontentloaded" });
      await page.locator(".ca-screenshot .ca-stage").first().click();
      const copy = page.locator(".cz-header .ca-copy");
      await page.waitForFunction(() =>
        document
          .querySelector(".cz-dialog")!
          .getAnimations({ subtree: true })
          .every((animation) => animation.playState !== "running"),
      );
      await copy.click();
      await expect(copy).toHaveAttribute("data-state", "failed");
      const status = page.locator(".cz-header .ca-copy-status");
      await expect(status).toHaveText(
        failure === "CORS"
          ? "The image's server doesn't allow copying it (no CORS)."
          : "This page can't write to the clipboard. Right-click the image and copy it instead.",
      );
      await expect(status).toBeVisible();
      const feedback = (await status.boundingBox())!;
      const header = (await page.locator(".cz-header").boundingBox())!;
      const item = (await page.locator(".cz-item").boundingBox())!;
      expect(feedback.y).toBeGreaterThanOrEqual(header.y);
      expect(feedback.y + feedback.height).toBeLessThanOrEqual(header.y + header.height);
      expect(feedback.y + feedback.height).toBeLessThanOrEqual(item.y);
      expect(feedback.x).toBeGreaterThanOrEqual(0);
      expect(feedback.x + feedback.width).toBeLessThanOrEqual(viewport.width);
    });
  }
}

test("Copy keeps a circle's whole loop, where it reaches past its area", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  // A wide, short area, which the loop overshoots most.
  const body =
    await render(`::screenshot{src="/fixture/shot.png" alt="Dashboard" viewport="1280x800"}
:::annotation{x=30 y=40 w=40 h=6 mark="circle" color="red"}
A wide row.
:::
::`);
  const shot = await readFile(new URL("../docs/public/dashboard.png", import.meta.url));
  await page.route("**/fixture/shot.png", (route) =>
    route.fulfill({ contentType: "image/png", body: shot }),
  );
  await page.route("**/fixture/", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><meta charset="utf-8"><style>main{width:720px;padding:80px}</style><main>${body}</main>`,
    }),
  );
  await page.goto("/fixture/", { waitUntil: "domcontentloaded" });
  const figure = page.locator(".ca-screenshot").first();
  await figure.hover();
  await expect(figure.locator(".ca-overlay")).toHaveAttribute("src", /^blob:/);
  await figure.locator(".ca-copy").click();
  await expect(figure.locator(".ca-copy-status")).toHaveText("Copied");

  // The loop's left end lies outside its viewBox; the copy shows red there, as the page does.
  const found = await figure.evaluate(async (node) => {
    const [item] = await navigator.clipboard.read();
    const bitmap = await createImageBitmap(await item!.getType("image/png"));
    const box = node.getBoundingClientRect();
    const svg = node.querySelector(".ca-mark svg")!.getBoundingClientRect();
    const loop = node.querySelector(".ca-mark svg path")!.getBoundingClientRect();
    const scale = bitmap.width / (box.width + 32);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d")!;
    context.drawImage(bitmap, 0, 0);
    const x = Math.round((loop.left + 1 - box.left + 16) * scale);
    let red = 0;
    for (let y = loop.top; y <= loop.bottom; y++) {
      const [r = 0, g = 0, b = 0] = context.getImageData(
        x,
        Math.round((y - box.top + 16) * scale),
        1,
        1,
      ).data;
      if (r > 150 && g < 110 && b < 110) red++;
    }
    return { outside: loop.left < svg.left - 4, red };
  });
  expect(found.outside).toBe(true);
  expect(found.red).toBeGreaterThan(0);
});

test("Hide marks hides the marks and arrows without zooming, and Copy still draws them", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(
    page,
    `::screenshot{src="/before.png" alt="Filter toolbar" viewport="640x250"}
:::annotation{x=4.5 y=28.7 w=40 h=44.4 color="red"}
The toolbar wraps.
:::

:::annotation{x=60 y=40 w=10 h=10 side="right"}
Apply sits low.
:::
::`,
  );
  const figure = page.locator("main .ca-screenshot");
  const toggle = figure.locator(".ca-hide");
  const marks = figure.locator(":is(.ca-mark,.ca-arrow)");
  await expect(marks).toHaveCount(3);
  // Like Copy, it shows on hover, beside Copy.
  await expect(toggle).toHaveCSS("opacity", "0");
  await figure.locator(".ca-frame > img:not(.ca-overlay)").hover();
  await expect(toggle).toHaveCSS("opacity", "1");
  const [hide, copy] = [await toggle.boundingBox(), await figure.locator(".ca-copy").boundingBox()];
  expect(hide!.x + hide!.width).toBeLessThan(copy!.x);

  await expect(toggle.locator(".ca-eye")).toBeVisible();
  await expect(toggle.locator(".ca-eye-off")).toBeHidden();
  await toggle.click();
  await expect(toggle.locator("input")).toBeChecked();
  // The icon says the marks are hidden.
  await expect(toggle.locator(".ca-eye")).toBeHidden();
  await expect(toggle.locator(".ca-eye-off")).toBeVisible();
  for (const mark of await marks.all()) await expect(mark).toBeHidden();
  await expect(page.locator(".cz-dialog")).toHaveCount(0);
  // It stays while the marks are hidden, so the reader can bring them back.
  await page.mouse.move(0, 0);
  await expect(toggle).toHaveCSS("opacity", "1");

  await figure.locator(".ca-copy").click();
  await expect(figure.locator(".ca-copy-status")).toHaveText("Copied");
  const [copied, expected] = await figure.evaluate(async (node) => {
    const [item] = await navigator.clipboard.read();
    const bitmap = await createImageBitmap(await item!.getType("image/png"));
    const box = node.getBoundingClientRect();
    const stamp = node.querySelector(".ca-mark .ca-stamp")!;
    const at = stamp.getBoundingClientRect();
    const scale = bitmap.width / (box.width + 32);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d")!;
    context.drawImage(bitmap, 0, 0);
    const x = Math.round((at.left + at.width / 2 - box.left + 16) * scale);
    const y = Math.round((at.top + 2 - box.top + 16) * scale);
    const pixel = [...context.getImageData(x, y, 1, 1).data].slice(0, 3);
    context.fillStyle = getComputedStyle(stamp).backgroundColor;
    context.fillRect(0, 0, 1, 1);
    return [pixel, [...context.getImageData(0, 0, 1, 1).data].slice(0, 3)];
  });
  for (const [index, channel] of copied.entries())
    expect(Math.abs(channel - expected[index]!)).toBeLessThan(24);

  // A zoomed copy keeps the reader's choice, and the keyboard brings the marks back.
  await figure.locator(".ca-stage").click({ position: { x: 10, y: 10 } });
  await expect(page.locator(".cz-item .ca-mark")).toHaveCount(2);
  for (const mark of await page.locator(".cz-item .ca-mark").all()) await expect(mark).toBeHidden();
  const zoomedToggle = page.locator(".cz-header .ca-hide input");
  // Native dialog focus wrapping varies; check that forward Tab reaches Hide marks.
  for (let tabs = 0; tabs < 4; tabs++) {
    await page.keyboard.press("Tab");
    if (await zoomedToggle.evaluate((input) => input === document.activeElement)) break;
  }
  await expect(zoomedToggle).toBeFocused();
  await page.keyboard.press("Space");
  await expect(zoomedToggle).not.toBeChecked();
  for (const mark of await page.locator(".cz-item .ca-mark").all())
    await expect(mark).toBeVisible();
  // In the header it comes before Copy and Close.
  await page.keyboard.press("Tab");
  await expect(page.locator(".cz-header .ca-copy")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator(".cz-close")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(zoomedToggle).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator(".cz-dialog")).toHaveCount(0);
  await toggle.locator("input").focus();
  await page.keyboard.press("Space");
  await expect(toggle.locator("input")).not.toBeChecked();
  for (const mark of await marks.all()) await expect(mark).toBeVisible();
});

test("hovering a mark or its note fades the other marks", async ({ page }) => {
  await open(
    page,
    `::screenshot{src="/after.png" alt="Filter toolbar on one row" viewport="640x250"}
:::annotation{x=5 y=30 w=15 h=20}
Search.
:::

:::annotation{x=40 y=30 w=15 h=20}
Chips.
:::

:::annotation{x=75 y=30 w=15 h=20}
Apply.
:::
::`,
  );
  const mark = (n: number) => page.locator(`main .ca-mark[data-n="${n}"]`);
  for (const n of [1, 2, 3]) await expect(mark(n)).toHaveCSS("opacity", "1");
  await page.locator('main .ca-notes li[data-n="2"]').hover();
  await expect(mark(2)).toHaveCSS("opacity", "1");
  await expect(mark(1)).toHaveCSS("opacity", "0.35");
  await expect(mark(3)).toHaveCSS("opacity", "0.35");
  await mark(3).hover();
  await expect(mark(3)).toHaveCSS("opacity", "1");
  await expect(mark(2)).toHaveCSS("opacity", "0.35");
  await page.mouse.move(0, 0);
  for (const n of [1, 2, 3]) await expect(mark(n)).toHaveCSS("opacity", "1");
});
