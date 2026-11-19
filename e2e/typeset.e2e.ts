import { createHtmlRenderer } from "@comark/html";
import { expect, test } from "@playwright/test";
import comarkUi from "../packages/ui/src/html.ts";

const render = createHtmlRenderer(
  comarkUi({
    chips: { download: false },
    badge: { download: false },
    icon: { fetch: false },
    diagrams: { draw: false },
  }),
);

test("the first block adds no space above, with the typeset styles before it", async ({ page }) => {
  const html = await render("## Plan\n\nThe first step.");
  expect(html.trimStart()).toMatch(/^<style data-comark-typeset>/);
  await page.setContent(`<!doctype html><main style="width:40rem">${html}</main>`);
  await expect(page.getByRole("heading", { name: "Plan" })).toHaveCSS("margin-top", "0px");
  await expect(page.getByText("The first step.")).not.toHaveCSS("margin-top", "0px");
});
