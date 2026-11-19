import { createHtmlRenderer } from "@comark/html";
import { expect, type Locator, type Page, test } from "@playwright/test";
import comarkUi from "../packages/ui/src/html.ts";

// A quiz through comark-ui's preset, so comark-motion's layer is in the page: its buttons squash on press, and a
// poll's percents roll and its bars grow to their shares when the results arrive after a vote.
const offline = { chips: { download: false }, badge: { download: false }, icon: { fetch: false } };

const question = `::question{#event-loop}
Which callback runs first?

- [x] A promise's \`then\` callback
- [ ] A \`setTimeout\` callback
::`;

const poll = `::poll{#next-topic}
What next?

- [ ] Workers
- [ ] Streams
- [ ] Caching
::`;

async function open(page: Page, markdown: string) {
  const { plugins, components } = comarkUi(offline);
  const html = await createHtmlRenderer({ plugins, components })(markdown);
  await page.goto("/no-such-page");
  await page.setContent(
    `<!doctype html><html lang="en"><body style="width:40rem;margin:2rem">${html}</body></html>`,
  );
  await expect.poll(() => page.evaluate(() => !!window.__comarkMotion)).toBe(true);
}

const inlineScale = (locator: Locator) =>
  locator.evaluate((element) => {
    const scale = element.style.scale;
    return scale ? Number(scale.split(" ")[0]) : 1;
  });

const send = (page: Page, detail: unknown) =>
  page.evaluate(
    (state) => document.dispatchEvent(new CustomEvent("comark-quiz:state", { detail: state })),
    detail,
  );

// Votes for Streams with a host that answers with the counts, and returns the Streams row's percent and bar.
async function vote(page: Page) {
  await send(page, { answers: {}, voting: { open: true } });
  const row = page.locator(".cqz-option", { hasText: "Streams" });
  await row.click();
  await expect(page.locator(".cqz")).toHaveAttribute("data-state", "voted");
  const keys = await page
    .locator(".cqz-option")
    .evaluateAll((rows) => rows.map((row) => row.getAttribute("data-key")!));
  await send(page, {
    results: {
      "next-topic": { counts: { [keys[0]!]: 1, [keys[1]!]: 6, [keys[2]!]: 1 }, total: 8 },
    },
  });
  return { percent: row.locator(".cqz-percent"), bar: row.locator(".cqz-bar") };
}

test("a quiz button squashes with the layer's spring and lets go on release", async ({ page }) => {
  await open(page, question);
  await page.evaluate(() => window.__comarkMotion?.setMotionSlowFactor(4));
  const check = page.getByRole("button", { name: "Check" });
  // No CSS press is left to compete with the spring.
  expect(
    await check.evaluate((element) => getComputedStyle(element).transitionProperty),
  ).not.toMatch(/\b(scale|transform|all)\b/);
  await check.hover();
  await page.mouse.down();
  await expect.poll(() => inlineScale(check)).toBeLessThan(1);
  await page.mouse.up();
  await expect
    .poll(() => check.evaluate((element) => element.style.scale), { timeout: 8000 })
    .toBe("");
});

test("a poll's percent rolls up and its bar grows to its share when the results arrive", async ({
  page,
}) => {
  await open(page, poll);
  await page.evaluate(() => window.__comarkMotion?.setMotionSlowFactor(4));
  const { percent, bar } = await vote(page);
  // The roll's digit columns stand in for the text while it moves, and the text is the final number at all times.
  await expect(percent.locator("[data-motion-glyphs]")).toHaveCount(1);
  await expect(percent).toHaveText("75%");
  // The bar starts at the start of its row and grows on a spring to its share.
  await expect.poll(() => inlineScale(bar)).toBeLessThan(0.9);
  await expect
    .poll(() => percent.evaluate((element) => element.childElementCount), { timeout: 8000 })
    .toBe(0);
  await expect(percent).toHaveText("75%");
  await expect
    .poll(() => bar.evaluate((element) => element.style.scale), { timeout: 8000 })
    .toBe("");
  const share = await bar.evaluate(
    (element) =>
      element.getBoundingClientRect().width / element.parentElement!.getBoundingClientRect().width,
  );
  expect(share).toBeCloseTo(0.75, 1);
});

test("under reduced motion a poll's results land at once", async ({ page }) => {
  await open(page, poll);
  await page.evaluate(() => window.__comarkMotion?.forceReducedMotion(true));
  const { percent, bar } = await vote(page);
  await expect(percent).toHaveText("75%");
  expect(await bar.evaluate((element) => element.style.scale)).toBe("");
  // A reduced roll crossfades its digits for 150ms and leaves plain text.
  await expect.poll(() => percent.evaluate((element) => element.childElementCount)).toBe(0);
  const share = await bar.evaluate(
    (element) =>
      element.getBoundingClientRect().width / element.parentElement!.getBoundingClientRect().width,
  );
  expect(share).toBeCloseTo(0.75, 1);
});

test("results a host restores land at once, with no roll", async ({ page }) => {
  await open(page, poll);
  const keys = await page
    .locator(".cqz-option")
    .evaluateAll((rows) => rows.map((row) => row.getAttribute("data-key")!));
  await send(page, {
    answers: { "next-topic": { choice: [keys[1]!] } },
    results: { "next-topic": { counts: { [keys[0]!]: 1, [keys[1]!]: 3 }, total: 4 } },
    voting: { open: true },
  });
  const row = page.locator(".cqz-option", { hasText: "Streams" });
  await expect(row.locator(".cqz-percent")).toHaveText("75%");
  expect(await row.locator(".cqz-percent").evaluate((element) => element.childElementCount)).toBe(
    0,
  );
  expect(await row.locator(".cqz-bar").evaluate((element) => element.style.scale)).toBe("");
});
