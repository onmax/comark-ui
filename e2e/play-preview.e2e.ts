import { expect, type Page, test } from "@playwright/test";
import { themeFile } from "../docs/play-link.ts";
import { defaultTheme, themePresets, themeText } from "../docs/play-theme.ts";
import { playDocument } from "../docs/preview.ts";

const preview = (page: Page) => page.frameLocator("iframe");
async function open(page: Page, theme = defaultTheme()) {
  await page.setContent('<iframe sandbox="allow-scripts allow-popups"></iframe>');
  const dark = await page.evaluate(() => matchMedia("(prefers-color-scheme: dark)").matches);
  // The document is rendered in Node, with the same initial system scheme as the browser.
  globalThis.matchMedia = (media) => ({
    matches: dark,
    media,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => true,
  });
  const html = playDocument(
    '<p style="background:var(--background);color:var(--foreground)">Preview</p>',
    { [themeFile]: themeText(theme) },
  );
  Reflect.deleteProperty(globalThis, "matchMedia");
  await page
    .locator("iframe")
    .evaluate((frame, doc) => ((frame as HTMLIFrameElement).srcdoc = doc), html);
}

for (const initial of ["light", "dark"] as const) {
  test(`an implicit ${initial} scheme follows the system in the sandbox`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: initial });
    await open(page);
    const root = preview(page).locator("html");
    const text = preview(page).getByText("Preview");
    for (const scheme of [initial, initial === "light" ? "dark" : "light", initial] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await expect(root).toHaveClass(scheme);
      await expect(root).toHaveCSS("color-scheme", scheme);
      await expect(text).toHaveCSS(
        "background-color",
        scheme === "dark" ? "rgb(10, 10, 10)" : "rgb(255, 255, 255)",
      );
      await expect(text).toHaveCSS(
        "color",
        scheme === "dark" ? "rgb(250, 250, 250)" : "rgb(10, 10, 10)",
      );
    }
  });

  test(`an explicit ${initial} scheme stays fixed when the system changes`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: initial });
    await open(page, { ...defaultTheme(), scheme: initial });
    const root = preview(page).locator("html");
    await expect(root).toHaveClass(initial);
    await page.emulateMedia({ colorScheme: initial === "light" ? "dark" : "light" });
    await expect(root).toHaveClass(initial);
    await expect(root).toHaveCSS("color-scheme", initial);
  });
}

test("system changes preserve custom theme colors", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  const violet = themePresets.find(({ id }) => id === "violet")!;
  await open(page, {
    ...defaultTheme(),
    ...violet,
    preset: violet.id,
    css: "p{background:var(--comark-background)!important}",
  });
  const text = preview(page).getByText("Preview");
  await expect(text).toHaveCSS("background-color", "rgb(245, 243, 255)");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(text).toHaveCSS("background-color", "rgb(46, 16, 101)");
});
