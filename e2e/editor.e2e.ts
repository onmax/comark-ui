import { expect, test } from "@playwright/test";

test("pasting keeps CriticMarkup deletions and substitutions distinct from strike", async ({
  page,
}) => {
  await page.goto("/play/editor/");
  const markdown = page.getByRole("textbox", { name: "Markdown", exact: true });
  const rich = page.getByRole("textbox", { name: "Rich text", exact: true });
  await markdown.fill("Paste here\n");
  await expect(rich).toHaveText("Paste here");
  await rich.selectText();
  await rich.evaluate((element) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData(
      "text/html",
      "<p><del data-critic>deleted</del> <del data-critic data-substitution>old</del><ins data-substitution>new</ins> <del>strike</del></p>",
    );
    element.dispatchEvent(
      new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData }),
    );
  });
  await expect(markdown).toHaveValue("{--deleted--} {~~old~>new~~} ~~strike~~\n");
});
