import { createHtmlRenderer } from "@comark/html";
import { expect, type Page, test } from "@playwright/test";
import comarkUi from "../packages/ui/src/html.ts";

// A time's tooltip and a citation's card appear next to their trigger: the motion layer's appear effect raises each
// from behind it, slides the card between citations, and sinks each back on a copy when it goes.

const offline = { chips: { download: false }, badge: { download: false }, icon: { fetch: false } };

async function open(page: Page, markdown: string) {
  const { plugins, components } = comarkUi(offline);
  const html = await createHtmlRenderer({ plugins, components })(markdown);
  // No `page.goto()` first: after a navigation, Chromium stops sending `pointerout`, which closes both.
  await page.setContent(
    `<!doctype html><html><head><style>body{width:36rem;margin:10rem 2rem}</style></head><body>${html}</body></html>`,
  );
  await page.waitForFunction(() => window.__comarkMotion);
}

type Rect = { left: number; top: number; right: number; bottom: number; width: number };
type Frame = { rect: Rect; translate: string; clip: string; opacity: string; ghost: boolean };

/** Records every frame of the elements that match `selector`, the live one and the layer's exit copy. */
function record(page: Page, selector: string) {
  return page.evaluate((selector) => {
    const frames: Frame[] = [];
    const sample = () => {
      for (const element of document.querySelectorAll<HTMLElement>(selector)) {
        if (getComputedStyle(element).display === "none") continue;
        const { left, top, right, bottom, width } = element.getBoundingClientRect();
        frames.push({
          rect: { left, top, right, bottom, width },
          translate: element.style.translate,
          clip: element.style.clipPath,
          opacity: element.style.opacity,
          ghost: element.getAttribute("data-motion") === "none",
        });
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
    (window as unknown as { frames_: Frame[] }).frames_ = frames;
  }, selector);
}

const take = (page: Page) =>
  page.evaluate(() => {
    const frames = (window as unknown as { frames_: Frame[] }).frames_;
    return frames.splice(0, frames.length);
  });

const rectOf = (page: Page, selector: string) =>
  page.locator(selector).evaluate((element) => {
    const { left, top, right, bottom, width } = element.getBoundingClientRect();
    return { left, top, right, bottom, width };
  });

/** Waits until the layer has cleared what it wrote on the element. */
const landed = (page: Page, selector: string) =>
  expect
    .poll(
      () =>
        page
          .locator(selector)
          .evaluate((element: HTMLElement) =>
            [element.style.translate, element.style.clipPath, element.style.opacity].join(""),
          ),
      { timeout: 10_000 },
    )
    .toBe("");

/** The part of a frame that isn't clipped away, from the `inset()` the layer writes. */
function visibleWidth(frame: Frame): number {
  const insets = /inset\(([^)]*?)(?: round [^)]*)?\)/.exec(frame.clip)?.[1];
  if (!insets) return frame.rect.width;
  const [, right = 0, , left = right] = insets
    .split(/\s+/)
    .map((value) => Math.max(0, parseFloat(value)));
  return frame.rect.width - left - right;
}

const ty = (frame: Frame) => parseFloat(frame.translate.split(" ")[1] ?? "0") || 0;

const live = ".ctm-live:not([data-motion=none])";
const card = ".cso-card:not([data-motion=none])";

test("a time's tooltip rises from behind the time, widens, and sinks back on a copy", async ({
  page,
}) => {
  await open(page, "Opened :time[2026-11-02] by the loft.");
  await page.evaluate(() => window.__comarkMotion!.setMotionSlowFactor(4));
  await record(page, ".ctm-live");
  const time = await rectOf(page, ".ctm");
  await page.locator(".ctm").hover();

  await expect(page.locator(live)).toHaveCount(1);
  await landed(page, live);
  const rest = await rectOf(page, live);
  // It lands above the time, and the time's own tooltip stays hidden.
  expect(rest.bottom).toBeLessThanOrEqual(time.top);
  await expect(page.locator(".ctm-tip[role=tooltip]")).toHaveCSS("visibility", "hidden");

  const rising = (await take(page)).filter((frame) => !frame.ghost && frame.translate);
  expect(rising.length).toBeGreaterThan(3);
  // It starts narrow and lower, with the part below the time's top edge clipped away.
  const first = rising[0]!;
  expect(visibleWidth(first)).toBeLessThan(rest.width / 2);
  expect(ty(first)).toBeGreaterThan(0);
  expect(first.clip).toMatch(/^inset\(/);

  await page.mouse.move(0, 0);
  await expect(page.locator(live)).toHaveCount(0);
  const ghost = page.locator(".ctm-live[data-motion=none]");
  await expect(ghost).toHaveCount(1);
  await expect(ghost).toHaveAttribute("aria-hidden", "true");
  await expect(ghost).toHaveCount(0, { timeout: 10_000 });
  const leaving = (await take(page)).filter((frame) => frame.ghost);
  // The copy starts where the tooltip was, then narrows and sinks behind the time.
  expect(Math.abs(leaving[0]!.rect.top - rest.top)).toBeLessThan(2);
  expect(leaving.some((frame) => visibleWidth(frame) < rest.width / 2 && ty(frame) > 0)).toBe(true);
});

test("a citation's card rises from its citation, slides to the next, and sinks back on a copy", async ({
  page,
}) => {
  await open(
    page,
    [
      "By the sun :cite[1], and by smell :cite[2].",
      "::sources\n1. [Magnetoreception](https://en.wikipedia.org/wiki/Magnetoreception), on the sun\n2. [Homing](https://example.com/homing)\n::",
    ].join("\n\n"),
  );
  await page.evaluate(() => window.__comarkMotion!.setMotionSlowFactor(4));
  await record(page, ".cso-card");
  const one = page.locator('.cso-cite a[href="#cso-1"]');
  const two = page.locator('.cso-cite a[href="#cso-2"]');
  await one.hover();

  await expect(page.locator(card)).toHaveCSS("display", "block");
  await landed(page, card);
  const first = await rectOf(page, card);
  expect(first.bottom).toBeLessThanOrEqual((await rectOf(page, '.cso-cite a[href="#cso-1"]')).top);
  const rising = (await take(page)).filter((frame) => !frame.ghost && frame.translate);
  expect(rising.length).toBeGreaterThan(3);
  expect(visibleWidth(rising[0]!)).toBeLessThan(first.width / 2);
  expect(ty(rising[0]!)).toBeGreaterThan(0);

  // The open card moves to the next citation: it slides there rather than rising again.
  await two.hover();
  await expect(page.locator(card).locator(".cso-card-title")).toHaveText("Homing");
  await landed(page, card);
  const second = await rectOf(page, card);
  expect(Math.abs(second.left - first.left)).toBeGreaterThan(20);
  const sliding = (await take(page)).filter((frame) => !frame.ghost && frame.translate);
  expect(sliding.length).toBeGreaterThan(3);
  // On the way it sits between the two places, at the height of both, never sunk behind a citation.
  const between = sliding.filter(
    (frame) =>
      Math.min(first.left, second.left) + 2 < frame.rect.left &&
      frame.rect.left < Math.max(first.left, second.left) - 2,
  );
  expect(between.length).toBeGreaterThan(0);
  for (const frame of between) expect(Math.abs(frame.rect.top - second.top)).toBeLessThan(4);

  await page.mouse.move(0, 0);
  await expect(page.locator(card)).toBeHidden();
  const ghost = page.locator(".cso-card[data-motion=none]");
  await expect(ghost).toHaveCount(1);
  await expect(ghost).toBeVisible();
  await expect(ghost).toHaveCount(0, { timeout: 10_000 });
  const leaving = (await take(page)).filter((frame) => frame.ghost);
  expect(Math.abs(leaving[0]!.rect.top - second.top)).toBeLessThan(2);
  expect(Math.abs(leaving[0]!.rect.left - second.left)).toBeLessThan(2);
  expect(leaving.some((frame) => visibleWidth(frame) < second.width / 2 && ty(frame) > 0)).toBe(
    true,
  );
});

test("under reduced motion the tooltip and the card crossfade in place", async ({ page }) => {
  await open(
    page,
    [
      "Opened :time[2026-11-02], by the sun :cite[1].",
      "::sources\n1. [Magnetoreception](https://en.wikipedia.org/wiki/Magnetoreception)\n::",
    ].join("\n\n"),
  );
  await page.evaluate(() => {
    window.__comarkMotion!.forceReducedMotion(true);
    window.__comarkMotion!.setMotionSlowFactor(4);
  });

  for (const [trigger, selector, both] of [
    [".ctm", live, ".ctm-live"],
    ['.cso-cite a[href="#cso-1"]', card, ".cso-card"],
  ] as const) {
    await record(page, both);
    await page.locator(trigger).hover();
    await landed(page, selector);
    await page.mouse.move(0, 0);
    await expect(page.locator(`${both}[data-motion=none]`)).toHaveCount(1);
    await expect(page.locator(`${both}[data-motion=none]`)).toHaveCount(0, { timeout: 10_000 });
    const frames = await take(page);
    // It fades in and out, and never travels or gets clipped.
    expect(
      frames.some(
        (frame) => !frame.ghost && Number(frame.opacity) > 0 && Number(frame.opacity) < 1,
      ),
    ).toBe(true);
    expect(
      frames.some((frame) => frame.ghost && Number(frame.opacity) > 0 && Number(frame.opacity) < 1),
    ).toBe(true);
    expect(frames.every((frame) => !frame.translate && !frame.clip)).toBe(true);
  }
});
