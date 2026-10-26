import { createHtmlRenderer } from "@comark/html";
import { expect, type Page, test } from "@playwright/test";
import chips, { components as chipComponents } from "../packages/chips/src/html.ts";
import sources, { components } from "../packages/sources/src/html.ts";

// Favicons and avatars as data URIs, so the page asks no other site.
const square = (color: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1" fill="${color}"/></svg>`)}`;
const withChips = createHtmlRenderer({
  plugins: [
    chips({ download: false, favicon: () => square("teal"), avatar: () => square("orange") }),
    sources(),
  ],
  components: { ...components, ...chipComponents },
});
const alone = createHtmlRenderer({ plugins: [sources()], components });
const markdown = [
  "By the sun :cite[1], and by smell :cite[2].",
  "::sources\n1. [Magnetoreception](https://en.wikipedia.org/wiki/Magnetoreception), on the sun\n2. [Homing](https://github.com/onmax/comark-ui)\n::",
].join("\n\n");
const open = (page: Page, html: string) =>
  page.setContent(
    `<!doctype html><html><body style="width:40rem;margin:8rem 2rem">${html}</body></html>`,
  );
const cite = (page: Page, n: number) => page.locator(`.cso-cite a[href="#cso-${n}"]`).first();

test("a citation shows its source in a card while the pointer rests on it", async ({ page }) => {
  await open(page, await withChips(markdown));
  const card = page.locator(".cso-card");
  await cite(page, 1).hover();
  await expect(card).toBeVisible();
  await expect(card.locator(".cso-card-host")).toHaveText("en.wikipedia.org");
  await expect(card.locator(".cso-card-title")).toHaveText("Magnetoreception, on the sun");
  await expect(card.getByRole("link")).toHaveAttribute(
    "href",
    "https://en.wikipedia.org/wiki/Magnetoreception",
  );
  await expect(card).toHaveAttribute("data-icon", "image");
  // The browser's own tooltip would show beside the card.
  await expect(cite(page, 1)).not.toHaveAttribute("title");
  await expect(cite(page, 1)).toHaveAttribute("aria-description", "Magnetoreception, on the sun");

  await card.hover();
  await page.waitForTimeout(400);
  await expect(card).toBeVisible();
  // The pointer lands on the card's link, so a click opens the source.
  await card.getByRole("link").click({ trial: true, timeout: 2000 });
  // The next citation takes the open card at once, round for an account's avatar.
  await cite(page, 2).hover();
  await expect(card.locator(".cso-card-title")).toHaveText("Homing");
  await expect(card).toHaveAttribute("data-icon", "avatar");
  await page.mouse.move(0, 0);
  await expect(card).toBeHidden();
});

test("the keyboard opens a card, and Escape closes it", async ({ page }) => {
  await open(page, await withChips(markdown));
  const card = page.locator(".cso-card");
  await page.keyboard.press("Tab");
  await expect(cite(page, 1)).toBeFocused();
  await expect(card).toBeVisible();
  await expect(cite(page, 1)).toHaveAttribute("aria-describedby", "cso-card");
  await page.keyboard.press("Escape");
  await expect(card).toBeHidden();
  await expect(cite(page, 1)).not.toHaveAttribute("aria-describedby");
  await page.keyboard.press("Tab");
  await expect(card).toBeVisible();
  await expect(card.locator(".cso-card-title")).toHaveText("Homing");
  await page.keyboard.press("Enter");
  await expect(card).toBeHidden();
  await expect(page.locator("#cso-2")).toBeInViewport();
});

test.describe("on a touch screen", () => {
  test.use({ hasTouch: true });

  test("a tap follows the citation to its source, with no card", async ({ page }) => {
    await open(page, await withChips(markdown));
    await cite(page, 2).tap();
    await expect(page).toHaveURL(/#cso-2$/);
    await expect(page.locator(".cso-card")).toHaveCount(0);
  });
});

test("a source the list shows no icon for gets a globe", async ({ page }) => {
  await open(page, await alone(markdown));
  await cite(page, 2).hover();
  await expect(page.locator(".cso-card")).toHaveAttribute("data-icon", "globe");
  await expect(page.locator(".cso-card-globe")).toBeVisible();
});

test("a citation shows its own document's source when a page holds several", async ({ page }) => {
  const other = markdown.replace(
    "[Magnetoreception](https://en.wikipedia.org/wiki/Magnetoreception)",
    "[Sun compass](https://example.com/sun)",
  );
  await open(
    page,
    `<article>${await alone(markdown)}</article><article>${await alone(other)}</article>`,
  );
  await page.locator("article").nth(1).locator('.cso-cite a[href="#cso-1"]').hover();
  const card = page.locator(".cso-card");
  await expect(card.locator(".cso-card-title")).toHaveText("Sun compass, on the sun");
  await expect(card.locator(".cso-card-host")).toHaveText("example.com");
  await expect(card.getByRole("link")).toHaveAttribute("href", "https://example.com/sun");
});
