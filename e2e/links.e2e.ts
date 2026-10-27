import { createHtmlRenderer } from "@comark/html";
import { expect, test } from "@playwright/test";
import { anchors, components } from "../packages/links/src/html.ts";
import { typesetCss } from "../packages/ui/src/typeset-css.ts";

test("a heading's anchor adds no paragraph spacing above the first line", async ({ page }) => {
  const render = createHtmlRenderer({ plugins: [anchors()], components });
  const html = await render("### A heading with a link\n\nThe paragraph follows it.");
  await page.setContent(
    `<style>main h3 { margin-block: 0 }</style><main><style>${typesetCss}</style>${html}</main>`,
  );
  const heading = page.getByRole("heading", { name: "A heading with a link" });
  const link = page.getByRole("link", { name: 'Section titled "A heading with a link"' });
  await expect(link).toHaveAttribute("href", "#a-heading-with-a-link");
  await expect(link).toHaveCSS("margin-top", "0px");
  const top = await page
    .locator(".cl-heading")
    .evaluate((element) => element.getBoundingClientRect().top);
  expect(await heading.evaluate((element) => element.getBoundingClientRect().top)).toBe(top);
});

test("unlayered host styles can override heading anchor margins", async ({ page }) => {
  const render = createHtmlRenderer({ plugins: [anchors()], components });
  const html = await render("### A heading with a link");
  await page.setContent(
    `<style>a { margin-block: 7px 11px }</style><main><style>${typesetCss}</style>${html}</main>`,
  );
  const link = page.getByRole("link", { name: 'Section titled "A heading with a link"' });
  await expect(link).toHaveCSS("margin-top", "7px");
  await expect(link).toHaveCSS("margin-bottom", "11px");
});
