import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { createHtmlRenderer } from "@comark/html";
import { expect, type Page, test } from "@playwright/test";
import badge, { components } from "../packages/badge/src/html.ts";

const render = createHtmlRenderer({ plugins: [badge()], components });

test("renders document badge images at their preset heights", async ({ page }) => {
  await page.setContent(
    await render(
      [
        ':badge[v1.2.3]{label="npm" preset="npmx" icon="npmx"}',
        ':badge[v1.2.3]{label="npm" preset="nuxt" icon="nuxt"}',
        ':badge[v1.2.3]{label="npm" preset="flat" icon="npm"}',
        ':badge[v1.2.3]{label="npm" preset="for-the-badge" icon="npm"}',
      ].join("\n"),
    ),
  );
  await expect
    .poll(() =>
      page.locator(".cb-image").evaluateAll((images) =>
        images.map((image) => ({
          natural: image instanceof HTMLImageElement ? image.naturalHeight : 0,
          rendered: Math.round(image.getBoundingClientRect().height),
        })),
      ),
    )
    .toEqual(
      expect.arrayContaining([
        { natural: 20, rendered: 20 },
        { natural: 26, rendered: 26 },
        { natural: 28, rendered: 28 },
      ]),
    );
});

// docs/badges/index.html's form, run by docs/badges/main.ts as the docs app runs it. The browser loads the builder's
// TypeScript with its types stripped, since bundling it would need the docs' generated Nuxt tsconfig.
const repo = new URL("../", import.meta.url);
async function openBuilder(page: Page, search = "") {
  await page.context().route(
    ({ pathname }) => pathname.startsWith("/repo/"),
    (route) =>
      route.fulfill({
        contentType: "text/javascript",
        body: stripTypeScriptTypes(
          readFileSync(new URL(new URL(route.request().url()).pathname.slice(6), repo), "utf8"),
        ),
      }),
  );
  await page.context().route(
    ({ pathname }) => pathname === "/badges/",
    (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<!doctype html><meta charset="utf-8"><style>:root{--fg:#171717;--bg:#fff;--muted:#737373;--soft:#f5f5f5}${readFileSync(new URL("docs/badges/style.css", repo), "utf8")}</style>${readFileSync(new URL("docs/badges/index.html", repo), "utf8")}<script type="module">import { startBadgeBuilder } from "/repo/docs/badges/main.ts"; startBadgeBuilder(document.querySelector("[data-badge-builder]"));</script>`,
      }),
  );
  await page.goto(`/badges/${search}`);
  await expect(page.locator("#export-code")).not.toHaveValue("");
}

test("the builder's custom style round-trips through its link", async ({ page }) => {
  await openBuilder(page);
  await expect(page.locator("[data-custom]")).toBeHidden();
  await page.selectOption("select[name=style]", "custom");
  await expect(page.locator("[data-custom]")).toBeVisible();
  await page.fill("input[name=radius]", "0");
  await page.fill("input[name=padding]", "14");
  await page.fill("input[name=border]", "#a3a3a3");
  await page.selectOption("select[name=font]", "mono");
  await page.fill("input[name=labelText]", "#525252");
  await expect.poll(() => new URL(page.url()).searchParams.get("labelText")).toBe("#525252");
  const link = page.url();
  expect(Object.fromEntries(new URL(link).searchParams)).toMatchObject({
    style: "custom",
    radius: "0",
    padding: "14",
    border: "#a3a3a3",
    font: "mono",
  });
  const code = await page.locator("#export-code").inputValue();
  expect(code).toContain("radius=0");

  const restored = await page.context().newPage();
  await openBuilder(restored, new URL(link).search);
  await expect(restored.locator("[data-custom]")).toBeVisible();
  const values = await restored.evaluate(() =>
    Object.fromEntries(
      ["style", "radius", "padding", "border", "font", "labelText", "valueText"].map((name) => [
        name,
        (document.querySelector(`[name=${name}]`) as HTMLInputElement).value,
      ]),
    ),
  );
  expect(values).toEqual({
    style: "custom",
    radius: "0",
    padding: "14",
    border: "#a3a3a3",
    font: "mono",
    labelText: "#525252",
    valueText: "",
  });
  await expect(restored.locator("#export-code")).toHaveValue(code);
  await expect
    .poll(() =>
      restored
        .locator("#badge-preview")
        .evaluate((image) => (image as HTMLImageElement).naturalHeight),
    )
    .toBe(26);
});
