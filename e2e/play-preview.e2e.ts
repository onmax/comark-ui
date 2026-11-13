import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { themeFile } from "../docs/play-link.ts";
import { defaultTheme, themePresets, themeText } from "../docs/play-theme.ts";
import { playDocument } from "../docs/preview.ts";

// Match the page's stylesheet order, including the renderer's iframe defaults.
const styles = [
  import.meta.resolve("@vite-hub/ui-playground/styles.css"),
  import.meta.resolve("@vite-hub/ui/styles.css"),
  new URL("../docs/app/assets/play.css", import.meta.url),
]
  .map((url) => readFileSync(new URL(url), "utf8"))
  .join("\n");

const playground = (page: Page) => page.frameLocator("#play");
const preview = (page: Page) => playground(page).frameLocator(".vh-pg-preview");
async function setSystem(page: Page, scheme: "light" | "dark") {
  await page
    .locator("#play")
    .evaluate((frame, value) => ((frame as HTMLIFrameElement).style.colorScheme = value), scheme);
  await expect
    .poll(() =>
      playground(page)
        .locator("html")
        .evaluate(() => matchMedia("(prefers-color-scheme: dark)").matches),
    )
    .toBe(scheme === "dark");
}

async function open(page: Page, scheme: "light" | "dark", theme = defaultTheme()) {
  // Disable Playwright's global media override: the outer frame supplies a native preference to the playground,
  // which must then propagate through its actual styles to the sandboxed preview.
  await page.emulateMedia({ colorScheme: null });
  await page.setContent(`<iframe id="play" style="color-scheme:${scheme}"></iframe>`);
  await page
    .locator("#play")
    .evaluate(
      (frame, css) =>
        ((frame as HTMLIFrameElement).srcdoc =
          `<style>${css}</style><div class="play"><iframe class="vh-pg-preview" sandbox="allow-scripts allow-popups"></iframe></div>`),
      styles,
    );
  await playground(page).locator(".vh-pg-preview").waitFor({ state: "attached" });
  const dark = await playground(page)
    .locator("html")
    .evaluate(() => matchMedia("(prefers-color-scheme: dark)").matches);
  expect(dark).toBe(scheme === "dark");
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
  await playground(page)
    .locator(".vh-pg-preview")
    .evaluate((frame, doc) => ((frame as HTMLIFrameElement).srcdoc = doc), html);
}

for (const initial of ["light", "dark"] as const) {
  test(`an implicit ${initial} scheme follows the system in the sandbox`, async ({ page }) => {
    await open(page, initial);
    const root = preview(page).locator("html");
    const text = preview(page).getByText("Preview");
    for (const scheme of [initial, initial === "light" ? "dark" : "light", initial] as const) {
      await setSystem(page, scheme);
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
    await open(page, initial, { ...defaultTheme(), scheme: initial });
    const root = preview(page).locator("html");
    await expect(root).toHaveClass(initial);
    await setSystem(page, initial === "light" ? "dark" : "light");
    await expect(root).toHaveClass(initial);
    await expect(root).toHaveCSS("color-scheme", initial);
  });
}

test("system changes preserve custom theme colors", async ({ page }) => {
  const violet = themePresets.find(({ id }) => id === "violet")!;
  await open(page, "light", {
    ...defaultTheme(),
    ...violet,
    preset: violet.id,
    css: "p{background:var(--comark-background)!important}",
  });
  const text = preview(page).getByText("Preview");
  await expect(text).toHaveCSS("background-color", "rgb(245, 243, 255)");
  await setSystem(page, "dark");
  await expect(text).toHaveCSS("background-color", "rgb(46, 16, 101)");
});
