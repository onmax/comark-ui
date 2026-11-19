import { createHtmlRenderer } from "@comark/html";
import { expect, type Locator, type Page, test } from "@playwright/test";
import comarkUi, { renderIssues } from "../packages/ui/src/html.ts";

const offline = { chips: { download: false }, badge: { download: false }, icon: { fetch: false } };

async function open(page: Page, markdown: string, before = "") {
  const { plugins, components } = comarkUi(offline);
  const html = await createHtmlRenderer({ plugins, components })(markdown);
  await page.goto("/no-such-page");
  await page.setContent(
    `<!doctype html><html><body style="width:36rem;margin:2rem">${before}${html}</body></html>`,
  );
  await page.waitForFunction(() => window.__comarkMotion);
}

type Frame = { rotate: number; inline: string; open: boolean; content: number; opacity: number };

/** Records the chevron's angle and the content's height and opacity on every frame, from the click on. */
function record(details: Locator, chevron: string, content: string) {
  return details.evaluate(
    (element, { chevron, content }) => {
      const icon = element.querySelector<HTMLElement | SVGElement>(chevron)!;
      const frames: Frame[] = [];
      const sample = () => {
        const body = element.querySelector(content);
        frames.push({
          rotate: Number.parseFloat(getComputedStyle(icon).rotate) || 0,
          inline: icon.style.rotate,
          open: (element as HTMLDetailsElement).open,
          content: body?.getBoundingClientRect().height ?? 0,
          opacity: body ? Number(getComputedStyle(body).opacity) : 0,
        });
        if (frames.length < 600) requestAnimationFrame(sample);
      };
      element.addEventListener("click", () => requestAnimationFrame(sample), { once: true });
      (window as unknown as { frames_: Frame[] }).frames_ = frames;
    },
    { chevron, content },
  );
}

const frames = (page: Page) =>
  page.evaluate(() => (window as unknown as { frames_: Frame[] }).frames_);

/** Presses the summary as a person does: down, up, and the click that follows. */
async function press(page: Page, summary: Locator) {
  await summary.hover();
  await page.mouse.down();
  await page.mouse.up();
}

async function settled(page: Page, chevron: Locator) {
  await expect
    .poll(() => chevron.evaluate((element) => (element as HTMLElement).style.rotate), {
      timeout: 10_000,
    })
    .toBe("");
  return frames(page);
}

test("a details chevron turns with a spring from closed to open, and the content opens at once", async ({
  page,
}) => {
  await open(page, '::details{summary="Why?"}\nBecause.\n\nAnd that.\n::');
  await page.evaluate(() => window.__comarkMotion?.setMotionSlowFactor(4));
  const details = page.locator("details.cdt");
  const chevron = details.locator(".cdt-chevron");
  expect(await chevron.evaluate((element) => getComputedStyle(element).rotate)).toBe("45deg");
  await record(details, ".cdt-chevron", ".cdt>p");
  await press(page, details.locator("summary"));
  const seen = await settled(page, chevron);

  // The first frame after the click shows the content in full, while the chevron still turns.
  const [first] = seen;
  expect(first!.open).toBe(true);
  expect(first!.content).toBeGreaterThan(0);
  expect(first!.opacity).toBe(1);
  expect(seen.every((frame) => frame.content === first!.content)).toBe(true);
  // The chevron passes through the angles between closed and open on a spring.
  const between = seen.filter((frame) => frame.inline && frame.rotate > 50 && frame.rotate < 220);
  expect(between.length).toBeGreaterThan(3);
  expect(seen.some((frame) => frame.rotate > 225.5)).toBe(true);
  // At rest it sits on the open angle that the stylesheet gives, with no inline angle left.
  expect(await chevron.evaluate((element) => getComputedStyle(element).rotate)).toBe("225deg");
});

test("a second press turns the chevron back from where it is", async ({ page }) => {
  await open(page, '::details{summary="Why?"}\nBecause.\n::');
  await page.evaluate(() => window.__comarkMotion?.setMotionSlowFactor(4));
  const details = page.locator("details.cdt");
  const chevron = details.locator(".cdt-chevron");
  const summary = details.locator("summary");
  await press(page, summary);
  await expect
    .poll(() => chevron.evaluate((element) => Number.parseFloat(getComputedStyle(element).rotate)))
    .toBeGreaterThan(100);
  await record(details, ".cdt-chevron", ".cdt>p");
  await press(page, summary);
  const seen = await settled(page, chevron);
  expect(seen[0]!.open).toBe(false);
  // The first turn was still running, so the second keeps going from where it was: no frame jumps.
  expect(seen[0]!.inline).not.toBe("");
  const steps = seen.slice(1).map((frame, index) => Math.abs(frame.rotate - seen[index]!.rotate));
  expect(Math.max(...steps)).toBeLessThan(30);
  expect(await chevron.evaluate((element) => getComputedStyle(element).rotate)).toBe("45deg");
});

test("with reduced motion, the chevron takes the open angle at once", async ({ page }) => {
  await open(page, '::details{summary="Why?"}\nBecause.\n::');
  await page.evaluate(() => window.__comarkMotion?.forceReducedMotion(true));
  const details = page.locator("details.cdt");
  await record(details, ".cdt-chevron", ".cdt>p");
  await press(page, details.locator("summary"));
  await expect.poll(async () => (await frames(page)).length).toBeGreaterThan(2);
  const seen = await frames(page);
  expect(seen.slice(0, 3).map((frame) => [frame.rotate, frame.inline])).toEqual([
    [225, ""],
    [225, ""],
    [225, ""],
  ]);
});

test("the issues box folds its chevron with a spring", async ({ page }) => {
  await open(page, "Some text.", renderIssues({ issues: ["`::details` 1 has no summary."] }));
  await page.evaluate(() => window.__comarkMotion?.setMotionSlowFactor(4));
  const box = page.locator("details.cis");
  const fold = box.locator(".cis-fold");
  await record(box, ".cis-fold", ".cis-list");
  await press(page, box.locator("summary"));
  const seen = await settled(page, fold);
  expect(seen[0]!.open).toBe(false);
  expect(seen.some((frame) => frame.inline && frame.rotate < -5 && frame.rotate > -85)).toBe(true);
  expect(await fold.evaluate((element) => getComputedStyle(element).rotate)).toBe("-90deg");
});
