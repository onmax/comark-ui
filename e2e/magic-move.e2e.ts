import { createHtmlRenderer } from "@comark/html";
import { expect, type Page, test } from "@playwright/test";
import shiki from "comark/plugins/shiki";
import magicMove, { components } from "../packages/magic-move/src/html.ts";

const render = createHtmlRenderer({ plugins: [magicMove(), shiki()], components });
const open = async (page: Page, options: { script?: boolean } = {}) => {
  let html = await render(
    '::magic-move{title="Refactor"}\n```ts [Start]\nconst total = price * 2\n```\n\n```ts [Extract]\nconst rate = 2\nconst total = price * rate\n```\n\n```ts [Name]\nconst rate = 2\nconst total = price * rate\nexport { total }\n```\n::',
  );
  if (options.script === false) html = html.replace(/<script>[\s\S]*?<\/script>/g, "");
  await page.goto("/no-such-page");
  await page.setContent(
    `<!doctype html><html><body style="width:40rem;margin:2rem">${html}</body></html>`,
  );
};
const step = (page: Page, name: string) => page.getByRole("group").filter({ hasText: name });
// The pieces of the shown step that are moving or fading, by their text.
const moving = (page: Page) =>
  page.locator(".cmv-step:not([data-inactive])").evaluate((step) => {
    const kinds: Record<string, string[]> = { move: [], fade: [] };
    for (const animation of step.getAnimations({ subtree: true })) {
      const effect = animation.effect as KeyframeEffect;
      const kind = effect.getKeyframes().some((frame) => frame.transform) ? "move" : "fade";
      kinds[kind]!.push(effect.target?.textContent ?? "");
    }
    return kinds;
  });

test("without the script, every step reads in turn under its label", async ({ page }) => {
  await open(page, { script: false });
  for (const name of ["Start", "Extract", "Name"]) await expect(step(page, name)).toBeVisible();
  await expect(page.getByRole("button", { name: "Next step" })).toBeHidden();
});

test("the arrows and keys page through one step at a time", async ({ page }) => {
  await open(page);
  const next = page.getByRole("button", { name: "Next step" });
  const previous = page.getByRole("button", { name: "Previous step" });
  await expect(step(page, "Start")).toBeVisible();
  await expect(step(page, "Extract")).toBeHidden();
  await expect(previous).toHaveAttribute("aria-disabled", "true");
  await next.click();
  await expect(step(page, "Extract")).toBeVisible();
  await expect(step(page, "Start")).toBeHidden();
  await expect(page.locator(".cmv-count")).toHaveText("2 / 3");
  await page.keyboard.press("ArrowRight");
  await expect(step(page, "Name")).toBeVisible();
  await expect(next).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".cmv-count")).toHaveText("3 / 3");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect(step(page, "Start")).toBeVisible();
  // The copy text stays the code's, whatever the script wrapped.
  await expect(step(page, "Start").locator("pre")).toHaveText("const total = price * 2");
});

test("shared pieces move into place, new ones fade in, and old ones fade out where they stood", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: "Next step" }).click();
  const { move, fade } = await moving(page);
  // `total = price *` moves down a line, under the new `const rate = 2`.
  expect(move).toEqual(expect.arrayContaining(["total", "=", "price", "*"]));
  expect(fade).toEqual(expect.arrayContaining(["rate"]));
  // The `2` on the first line is new; the one that was at the end of `price * 2` fades out as a copy.
  await expect(page.locator(".cmv-ghost")).toHaveText(["2"]);
  await expect(page.locator(".cmv-ghost")).toHaveCount(0);
});

test("with reduced motion, the step changes without moving anything", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(step(page, "Extract")).toBeVisible();
  expect(await moving(page)).toEqual({ move: [], fade: [] });
  await expect(page.locator(".cmv-ghost")).toHaveCount(0);
});
