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
const step = (page: Page, name: string) =>
  page.locator(".cmv-step").filter({ has: page.locator(".cmv-caption", { hasText: name }) });
const tab = (page: Page, name: string) => page.getByRole("tab", { name });
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
  await expect(page.getByRole("tablist")).toBeHidden();
});

test("a tab opens its step, and the arrow keys, Home, and End move between tabs", async ({
  page,
}) => {
  await open(page);
  await expect(page.getByRole("tablist", { name: "Refactor" })).toBeVisible();
  await expect(page.getByRole("tabpanel")).toHaveCount(1);
  await expect(step(page, "Start")).toBeVisible();
  await tab(page, "Extract").click();
  await expect(step(page, "Extract")).toBeVisible();
  await expect(step(page, "Start")).toBeHidden();
  await expect(tab(page, "Extract")).toHaveAttribute("aria-selected", "true");
  await expect(tab(page, "Start")).toHaveAttribute("tabindex", "-1");
  await page.keyboard.press("ArrowRight");
  await expect(tab(page, "Name")).toBeFocused();
  await expect(step(page, "Name")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(tab(page, "Start")).toBeFocused();
  await page.keyboard.press("End");
  await expect(step(page, "Name")).toBeVisible();
  await page.keyboard.press("Home");
  await expect(step(page, "Start")).toBeVisible();
  // The copy text stays the code's, whatever the script wrapped.
  await expect(step(page, "Start").locator("pre")).toHaveText("const total = price * 2");
});

test("shared pieces move into place, new ones fade in, and old ones fade out where they stood", async ({
  page,
}) => {
  await open(page);
  await tab(page, "Extract").click();
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
  await tab(page, "Extract").click();
  await expect(step(page, "Extract")).toBeVisible();
  expect(await moving(page)).toEqual({ move: [], fade: [] });
  await expect(page.locator(".cmv-ghost")).toHaveCount(0);
});

test("a tab two steps away moves straight there", async ({ page }) => {
  await open(page);
  await tab(page, "Name").click();
  await expect(step(page, "Name")).toBeVisible();
  const { move, fade } = await moving(page);
  expect(move).toEqual(expect.arrayContaining(["total", "price"]));
  expect(fade).toEqual(expect.arrayContaining(["export"]));
});
