import { createHtmlRenderer } from "@comark/html";
import { expect, type Page, test } from "@playwright/test";
import comarkUi from "../packages/ui/src/html.ts";

const offline = { chips: { download: false }, badge: { download: false }, icon: { fetch: false } };

async function open(page: Page, markdown: string, after = "", style = "", optedOut = false) {
  const { plugins, components } = comarkUi(offline);
  const html = await createHtmlRenderer({ plugins, components })(markdown);
  await page.goto("/no-such-page");
  await page.setContent(
    `<!doctype html><html><head><style>body{width:36rem;margin:2rem}${style}</style></head><body><article${optedOut ? ' data-motion="none"' : ""}>${html}${after}</article></body></html>`,
  );
  await page.waitForFunction(() => window.__comarkMotion);
  await page
    .locator("img[data-zoom]")
    .evaluateAll((images) =>
      Promise.all(images.map((image) => (image as HTMLImageElement).decode())),
    );
}

type Box = { left: number; top: number; width: number; height: number };
type Frame = { box: Box | null; translate: string; scale: string; flying: boolean };

/** Records the zoomed copy's box on every frame, from now until the dialog is gone. */
function record(page: Page) {
  return page.evaluate(() => {
    const frames: Frame[] = [];
    let seen = false;
    const sample = () => {
      const frame = document.querySelector<HTMLElement>(".cz-item");
      if (frame) seen = true;
      const copy = frame?.firstElementChild;
      const rect = copy?.getBoundingClientRect();
      frames.push({
        box: rect
          ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
          : null,
        translate: frame?.style.translate ?? "",
        scale: frame?.style.scale ?? "",
        flying: Boolean(document.querySelector(".cz-stage[data-flying]")),
      });
      if (!seen || frame) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
    (window as unknown as { frames_: Frame[] }).frames_ = frames;
  });
}

const frames = (page: Page) =>
  page.evaluate(() => (window as unknown as { frames_: Frame[] }).frames_.slice());

const box = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((node) => {
      const { left, top, width, height } = node.getBoundingClientRect();
      return { left, top, width, height };
    });

const near = (a: Box, b: Box, by: number) =>
  Math.abs(a.left - b.left) <= by &&
  Math.abs(a.top - b.top) <= by &&
  Math.abs(a.width - b.width) <= by &&
  Math.abs(a.height - b.height) <= by;

test("a zoomed picture travels from its place in the page to the dialog, and back before the dialog goes", async ({
  page,
}) => {
  await open(page, "![Office correlations dashboard](/dashboard.png)");
  await page.evaluate(() => window.__comarkMotion!.setMotionSlowFactor(4));
  const picture = await box(page, "img[data-zoom]");

  await record(page);
  await page.locator("img[data-zoom]").first().click();
  const frame = page.locator(".cz-item");
  await expect
    .poll(() => frame.evaluate((node: HTMLElement) => node.style.translate + node.style.scale), {
      timeout: 10_000,
    })
    .toBe("");
  await expect(page.locator(".cz-stage[data-flying]")).toHaveCount(0);
  const zoomed = await box(page, ".cz-item > img");
  // The frame keeps its own scale; the travel only adds to it.
  expect(await frame.evaluate((node: HTMLElement) => node.style.transform)).toMatch(/^scale\(/);
  expect(zoomed.width).toBeGreaterThan(picture.width * 1.3);

  const opening = (await frames(page)).filter((sample) => sample.box);
  // The first frame drawn is still on the picture, and the copy then grows through the sizes between.
  expect(near(opening[0]!.box!, picture, picture.width * 0.08)).toBe(true);
  expect(opening[0]!.translate).not.toBe("");
  const between = opening.filter(
    ({ box }) => box!.width > picture.width + 20 && box!.width < zoomed.width - 20,
  );
  expect(between.length).toBeGreaterThan(3);
  expect(opening.every(({ flying, translate }) => flying || !translate)).toBe(true);

  await record(page);
  await page.keyboard.press("Escape");
  await expect(page.locator(".cz-dialog")).toHaveCount(0, { timeout: 10_000 });
  const closing = (await frames(page)).filter((sample) => sample.box);
  const shrinking = closing.filter(
    ({ box }) => box!.width > picture.width + 20 && box!.width < zoomed.width - 20,
  );
  expect(shrinking.length).toBeGreaterThan(3);
  // The dialog goes only once the copy has landed on the picture.
  expect(near(closing.at(-1)!.box!, picture, 2)).toBe(true);
});

test("Up and Down slide the next figure in from the step's side", async ({ page }) => {
  await open(page, "![Office correlations dashboard](/dashboard.png)\n\n![Before](/before.png)");
  await page.locator("img[data-zoom]").first().click();
  const frame = page.locator(".cz-item");
  await expect(page.locator(".cz-stage[data-flying]")).toHaveCount(0, { timeout: 10_000 });
  await page.evaluate(() => window.__comarkMotion!.setMotionSlowFactor(4));
  await page.keyboard.press("ArrowDown");
  await expect(page.locator(".cz-title")).toHaveText("Before");
  const moving = await frame.evaluate((node: HTMLElement) =>
    Number.parseFloat(node.style.translate.split(" ")[1] ?? ""),
  );
  expect(moving).toBeGreaterThan(0);
  expect(moving).toBeLessThanOrEqual(24);
  await expect
    .poll(() => frame.evaluate((node: HTMLElement) => node.style.translate), { timeout: 10_000 })
    .toBe("");
});

test("under reduced motion the zoom opens and closes at once", async ({ page }) => {
  await open(page, "![Office correlations dashboard](/dashboard.png)");
  await page.evaluate(() => window.__comarkMotion!.forceReducedMotion(true));
  await record(page);
  await page.locator("img[data-zoom]").first().click();
  await expect(page.locator(".cz-dialog")).toBeVisible();
  const zoomed = await box(page, ".cz-item > img");
  await expect.poll(async () => (await frames(page)).some((sample) => sample.box)).toBe(true);
  const [first] = (await frames(page)).filter((sample) => sample.box);
  expect(first!.translate).toBe("");
  expect(first!.scale).toBe("");
  expect(near(first!.box!, zoomed, 1)).toBe(true);
  await expect(page.locator(".cz-stage[data-flying]")).toHaveCount(0);

  await page.keyboard.press("Escape");
  await expect(page.locator(".cz-dialog")).toHaveCount(0, { timeout: 200 });
});

test("a body-mounted zoom honors the source article's motion opt-out", async ({ page }) => {
  await open(page, "![Dashboard](/dashboard.png)\n\n![Before](/before.png)", "", "", true);
  await page.locator("img[data-zoom]").first().click();
  const dialog = page.locator("body > .cz-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("data-motion", "none");
  await expect(dialog.locator(".cz-stage[data-flying]")).toHaveCount(0);
  await page.keyboard.press("ArrowDown");
  await expect(dialog.locator(".cz-title")).toHaveText("Before");
  expect(
    await dialog.locator(".cz-item").evaluate((frame: HTMLElement) => frame.style.translate),
  ).toBe("");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

const table = `::zoom\n| Attempt | Wait |\n| --- | --- |\n${Array.from({ length: 80 }, (_, index) => `| ${index + 1} | ${index * 2} s |`).join("\n")}\n::`;

/** The largest move of the copy between two frames drawn one after the other. */
const largestStep = (samples: Frame[]) =>
  Math.max(
    ...samples.slice(1).map((sample, index) => {
      const before = samples[index]!.box!;
      const box = sample.box!;
      return Math.max(Math.abs(box.left - before.left), Math.abs(box.top - before.top));
    }),
  );

for (const wait of [0, 300, 900]) {
  test(`a copy that closes ${wait}ms into opening goes back from where it is, with no jump`, async ({
    page,
  }) => {
    await open(page, table);
    await page.evaluate(() => window.__comarkMotion!.setMotionSlowFactor(4));
    await record(page);
    await page.locator(".cz").click();
    await expect(page.locator(".cz-stage[data-scroll][data-flying]")).toHaveCount(1);
    await page.waitForTimeout(wait);
    await page.keyboard.press("Escape");
    await expect(page.locator(".cz-dialog")).toHaveCount(0, { timeout: 10_000 });
    const samples = (await frames(page)).filter((sample) => sample.box);
    expect(samples.length).toBeGreaterThan(10);
    expect(largestStep(samples)).toBeLessThan(30);
  });
}

test("a scrolled copy closes from where it is", async ({ page }) => {
  await open(page, table);
  await page.locator(".cz").click();
  await expect(page.locator(".cz-stage[data-scroll]")).toHaveCount(1);
  await expect(page.locator(".cz-stage[data-flying]")).toHaveCount(0, { timeout: 10_000 });
  await page.evaluate(() => {
    window.__comarkMotion!.setMotionSlowFactor(4);
    document.querySelector(".cz-stage")!.scrollTop = 400;
  });
  await record(page);
  await page.keyboard.press("Escape");
  await expect(page.locator(".cz-dialog")).toHaveCount(0, { timeout: 10_000 });
  const samples = (await frames(page)).filter((sample) => sample.box);
  expect(samples.length).toBeGreaterThan(10);
  expect(largestStep(samples)).toBeLessThan(30);
});

test("the copy isn't cut off by the aside's column on its way to the page and back", async ({
  page,
}) => {
  await open(
    page,
    "![Plain](/before.png)",
    '<figure class="shot"><img src="/before.png" alt="Chart" data-zoom tabindex="0" data-zoom-context=".shot" data-zoom-aside="figcaption"><figcaption>Sales by week</figcaption></figure>',
    "body{width:1200px;margin:auto}figure.shot img{width:1100px}",
  );
  await page.evaluate(() => window.__comarkMotion!.setMotionSlowFactor(4));
  // On each frame of the travel, a point of the item's right part, over the aside's column past the stage, hits the
  // copy whenever the copy covers it.
  await page.evaluate(() => {
    const item = document.querySelector("figure.shot img")!.getBoundingClientRect();
    const [x, y] = [item.right - 20, item.top + item.height / 2];
    const hits: boolean[] = [];
    let seen = false;
    const sample = () => {
      const frame = document.querySelector(".cz-item");
      if (frame) seen = true;
      const copy = frame?.firstElementChild?.getBoundingClientRect();
      if (
        copy &&
        document.querySelector(".cz-stage[data-flying]") &&
        copy.left < x &&
        copy.right > x &&
        copy.top < y &&
        copy.bottom > y
      )
        hits.push(Boolean(document.elementFromPoint(x, y)?.closest(".cz-item")));
      if (!seen || frame) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
    Object.assign(window, { hits });
  });
  expect(
    await page.evaluate(
      () => document.querySelector("figure.shot img")!.getBoundingClientRect().right,
    ),
  ).toBeGreaterThan(page.viewportSize()!.width - 352);

  await page.locator("figure.shot img").click();
  await expect(page.locator(".cz-aside")).toHaveText("Sales by week");
  await expect(page.locator(".cz-stage[data-flying]")).toHaveCount(0, { timeout: 10_000 });
  await page.keyboard.press("Escape");
  await expect(page.locator(".cz-dialog")).toHaveCount(0, { timeout: 10_000 });
  const hits = await page.evaluate(() => (window as unknown as { hits: boolean[] }).hits);
  expect(hits.length).toBeGreaterThan(4);
  expect(hits.every(Boolean)).toBe(true);
});
