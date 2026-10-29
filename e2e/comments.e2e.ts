import { createHtmlRenderer } from "@comark/html";
import { expect, type Page, test } from "@playwright/test";
import comments, { components } from "../packages/comments/src/html.ts";

const review = [
  'To :suggestion[sign in]{from="log in" by="Claude" note="The button says Sign in."}, :suggestion[]{from="simply" by="Claude" note="“Simply” tells a stuck reader it should have been easy."} enter the email you signed up with and we’ll send you a link. The link expires after :comment[15 minutes]{#ttl by="@onmax" note="Is 15 minutes enough when email is slow?"} :suggestion[and works once]{by="Claude" note="People reuse old links and hit an error."}.',
  "",
  ':suggestion[If you forget]{from="In the event that you forget" by="Claude" note="Shorter, same meaning."} which email you used, ask :comment[a workspace admin]{by="sam" note="Can we link to the list of admins here?"}.',
  "",
  ':comment{reply="ttl" by="Claude" note="Keeping 15. The email has a resend button."}',
].join("\n");

const open = async (
  page: Page,
  markdown: string,
  width: string,
  mark: "track" | "pen" = "track",
) => {
  const html = await createHtmlRenderer({ plugins: [comments({ mark })], components })(markdown);
  await page.goto("/no-such-page");
  await page.setContent(
    `<!doctype html><html lang="en"><body style="margin:0;font:16px/1.75 system-ui,sans-serif"><main style="width:${width};margin:0 auto;padding:1.5rem">${html}</main></body></html>`,
  );
};
const box = async (page: Page, selector: string, index = 0) =>
  (await page.locator(selector).nth(index).boundingBox())!;

test("on a wide page, each card starts on its anchor's line, right of the text", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open(page, review, "68rem");
  const text = await box(page, ".cr > p");
  const anchor = await box(page, ".cr-sg");
  const card = await box(page, ".cr-card");
  await expect(page.locator(".cr-card").first()).toBeVisible();
  expect(Math.abs(card.y - anchor.y)).toBeLessThan(8);
  expect(card.x).toBeGreaterThanOrEqual(text.x + text.width);
  // The second paragraph's card starts no higher than its own line, below the cards stacked above it.
  const second = await box(page, ".cr > p", 1);
  const last = await box(page, ".cr-card", 4);
  expect(last.y).toBeGreaterThanOrEqual(second.y - 8);
  // Hovering a bubble highlights its anchor.
  await page.locator(".cr-bub").first().hover();
  await expect(page.locator(".cr-sg").first()).toHaveCSS("box-shadow", /rgb/);
});

test("on a phone, a bubble opens its card under the line", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, review, "auto");
  const card = page.locator(".cr-card").nth(2);
  await expect(card).toBeHidden();
  const toggle = page.getByRole("checkbox", { name: "2 comments on “15 minutes”" });
  await page.locator(".cr-bub").nth(2).click();
  await expect(toggle).toBeChecked();
  await expect(card).toBeVisible();
  await expect(card).toContainText("Keeping 15.");
  const anchor = await box(page, ".cr-cm");
  expect((await card.boundingBox())!.y).toBeGreaterThan(anchor.y + anchor.height - 1);
  // A second click closes it.
  await page.locator(".cr-bub").nth(2).click();
  await expect(card).toBeHidden();
});

for (const mark of ["track", "pen"] as const) {
  test(`the bubble stays on its anchor's last line at every line edge (${mark})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 800, height: 600 });
    await open(
      page,
      [
        'Long words wrap here before :comment[the anchor text]{note="Why?"} and then more words follow.',
        "",
        'The link expires after fifteen :suggestion[sign in]{from="log in" note="The button says Sign in."} and more words follow.',
      ].join("\n"),
      "auto",
      mark,
    );
    const bubbles = page.locator(".cr-bub");
    await expect(bubbles.first()).toHaveCSS("display", "inline");
    expect(await page.locator(".cr-bub svg").count()).toBe(0);
    // Every width from 12rem to 30rem puts the anchor's last word at the end of a line at least once.
    const broken = await page.evaluate(() => {
      const main = document.querySelector("main")!;
      const found: string[] = [];
      let edges = 0;
      for (let width = 192; width <= 480; width++) {
        main.style.width = `${width}px`;
        for (const bubble of document.querySelectorAll<HTMLElement>(".cr-bub")) {
          const anchor = bubble.previousElementSibling!.previousElementSibling!;
          const words = [...anchor.getClientRects()].at(-1)!;
          const own = bubble.getClientRects()[0]!;
          const next = bubble.nextElementSibling!.nextSibling;
          const range = document.createRange();
          if (next) {
            range.setStart(next, 0);
            range.setEnd(next, 1);
            if (range.getBoundingClientRect().top > own.top + 4) edges++;
          }
          const middle = (rect: DOMRect) => rect.top + rect.height / 2;
          if (Math.abs(middle(own) - middle(words)) > words.height / 2)
            found.push(`${width}px: ${anchor.textContent}`);
        }
      }
      return { found, edges };
    });
    expect(broken.edges).toBeGreaterThan(0);
    expect(broken.found).toEqual([]);
  });
}
