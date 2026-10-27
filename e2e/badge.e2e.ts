import { expect, test } from "@playwright/test";
import { badgeParams, readBadge } from "../packages/badge/src/svg.ts";
import { createBadgeHandler } from "../packages/badge/src/server.ts";

test.beforeEach(async ({ page }) => {
  const handle = createBadgeHandler({
    fetch: async (input) => {
      const url = input instanceof Request ? input.url : String(input);
      const data = url.includes("dist-tags")
        ? { latest: "1.2.3" }
        : url.includes("downloads")
          ? { downloads: 24500 }
          : { workflow_runs: [{ status: "completed", conclusion: "success" }] };
      return new Response(JSON.stringify(data));
    },
  });
  await page.route("**/badge.svg?*", async (route) => {
    const result = await handle(new Request(route.request().url()));
    await route.fulfill({
      status: result.status,
      headers: Object.fromEntries(result.headers),
      body: await result.text(),
    });
  });
});

test("builds, copies, downloads, and restores a static badge", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/badges/");
  await expect(page.getByRole("img", { name: "built with: Comark UI" })).toBeVisible();
  await page.getByLabel("Value", { exact: true }).fill('A "quoted" release');
  await page.getByLabel("Color scheme").selectOption("dark");
  await page.getByRole("button", { name: "Refresh preview" }).click();
  await page.getByLabel("Export", { exact: true }).selectOption("comark");
  await expect(page.locator("#export-code")).toHaveValue(/quoted/);
  await page.getByLabel("Export", { exact: true }).selectOption("markdown");
  await page.getByRole("button", { name: "Copy Markdown", exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("![built with:");
  await page.getByRole("button", { name: "Copy builder link" }).click();
  const shared = await page.evaluate(() => navigator.clipboard.readText());
  expect(shared).toContain("theme=dark");
  await page.goto(shared);
  await expect(page.getByLabel("Value", { exact: true })).toHaveValue('A "quoted" release');
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download SVG" }).click();
  expect((await downloaded).suggestedFilename()).toBe("badge.svg");
  await page.setViewportSize({ width: 320, height: 720 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test("previews all live sources and validates the options", async ({ page }) => {
  await page.goto("/badges/");
  await page.getByRole("button", { name: "npm version", exact: true }).click();
  await expect(page.getByRole("img", { name: "npm: v1.2.3" })).toBeVisible();
  await page.getByRole("button", { name: "Downloads", exact: true }).click();
  await expect(page.getByRole("img", { name: "downloads: 24.5k/mo" })).toBeVisible();
  await page.getByRole("button", { name: "GitHub Actions", exact: true }).click();
  await expect(page.getByRole("img", { name: "build: passing" })).toBeVisible();
  await page.getByLabel("Repository", { exact: true }).fill("../invalid");
  await page.getByRole("button", { name: "Refresh preview" }).click();
  await expect(page.getByRole("alert")).toContainText("owner/repo");
  await expect(page.getByRole("button", { name: "Download SVG" })).toBeDisabled();
  await expect(page.locator("#export-code")).toHaveValue("");
});

test("explains unavailable data and blocks stale downloads during edits", async ({ page }) => {
  await page.route("**/badge.svg?*", async (route) => {
    const handle = createBadgeHandler({
      fetch: async () => new Response("limited", { status: 429 }),
    });
    const result = await handle(new Request(route.request().url()));
    await route.fulfill({ headers: Object.fromEntries(result.headers), body: await result.text() });
  });
  await page.goto("/badges/?source=npm-version&package=comark-ui");
  await expect(page.getByRole("img", { name: "npm: unavailable" })).toBeVisible();
  await expect(page.locator("#preview-status")).toContainText("Live data is unavailable");
  await page.getByLabel("Package", { exact: true }).fill("../invalid");
  await expect(page.getByRole("button", { name: "Download SVG" })).toBeDisabled();
});

test("uses the docs shell and survives client navigation with a shared configuration", async ({
  page,
}) => {
  await page.goto("/badge/");
  await page.evaluate(() => {
    window.sessionStorage.setItem("builder-navigation", "same-document");
    (window as Window & { badgeNavigation?: boolean }).badgeNavigation = true;
  });
  await page.getByRole("link", { name: "builder", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Badge builder", exact: true })).toBeVisible();
  await expect(
    page.locator(".sidebar a[aria-current]").filter({ hasText: "Badge builder" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => (window as Window & { badgeNavigation?: boolean }).badgeNavigation),
  ).toBe(true);
  await expect(page.getByRole("combobox", { name: "Style", exact: true })).toHaveValue("shadcn");
  await page.getByRole("button", { name: "Docs", exact: true }).click();
  await page.getByRole("combobox", { name: "Logo", exact: true }).selectOption("shadcn");
  await page.getByLabel("Export", { exact: true }).selectOption("comark");
  await expect(page.locator("#export-code")).toHaveValue(/icon="shadcn"/);
  const shared = page.url();
  await page.goto(shared);
  await expect(page.getByRole("combobox", { name: "Logo", exact: true })).toHaveValue("shadcn");
  await expect(page.getByLabel("Export", { exact: true })).toHaveValue("comark");
  await page.getByRole("link", { name: "Badge syntax and hosting options" }).click();
  await expect(page.getByRole("heading", { name: "Badge", exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("img", { name: "docs: comark-ui.onmax.me" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Logo", exact: true })).toHaveValue("shadcn");
});
for (const input of [
  { value: "release" },
  { source: "npm-version", package: "comark-ui" },
  { source: "npm-downloads", package: "comark-ui" },
  { source: "npm-version", package: "comark-ui", preset: "npmx" },
  { source: "npm-downloads", package: "comark-ui", preset: "nuxt", icon: "none" },
]) {
  test(`restores canonical configuration ${JSON.stringify(input)}`, async ({ page }) => {
    const parsed = readBadge(input);
    if (!parsed.ok) throw new Error(parsed.error);
    const params = badgeParams(parsed.value);
    await page.goto(`/badges/?${params}`);
    await page.getByLabel("Export", { exact: true }).selectOption("image-url");
    await expect(page.locator("#export-code")).not.toHaveValue("");
    const imageUrl = await page.locator("#export-code").inputValue();
    expect(readBadge(Object.fromEntries(new URL(imageUrl).searchParams))).toEqual(parsed);
    await expect(page.locator('[name="color"]')).toHaveValue("primary");
    await page.reload();
    await expect(page.locator("#export-code")).toHaveValue(imageUrl);
    await page.getByRole("button", { name: "GitHub Actions", exact: true }).click();
    await expect(page.getByRole("img", { name: "build: passing" })).toBeVisible();
  });
}

test("switches presets, preserves chosen logos, and shares the rendered result", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/badges/?source=npm-version&package=comark-ui");
  const logo = page.getByRole("combobox", { name: "Logo", exact: true });
  const style = page.getByRole("combobox", { name: "Style", exact: true });
  await expect(logo).toHaveValue("npm");
  await style.selectOption("solid");
  await page.locator('[data-look="npmx"]').click();
  await expect(logo).toHaveValue("npmx");
  await expect(style).toBeHidden();
  await expect(page.locator('[name="labelColor"]')).toBeHidden();
  await page.locator('[data-look="nuxt"]').click();
  await expect(logo).toHaveValue("nuxt");
  await expect(page.getByRole("img", { name: "npm: v1.2.3" })).toBeVisible();
  await page.getByRole("button", { name: "Copy builder link" }).click();
  const shared = await page.evaluate(() => navigator.clipboard.readText());
  expect(shared).toContain("preset=nuxt");
  expect(shared).not.toContain("style=");
  await page.goto(shared);
  await expect(page.locator('[data-look="nuxt"]')).toHaveAttribute("aria-pressed", "true");
  await expect(logo).toHaveValue("nuxt");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download SVG" }).click();
  const stream = await (await download).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  expect(Buffer.concat(chunks).toString()).toContain('fill="#00dc82"');
  for (const icon of ["github", "none"]) {
    await logo.selectOption(icon);
    await page.locator('[data-look="npmx"]').click();
    await expect(logo).toHaveValue(icon);
    await page.locator('[data-look="nuxt"]').click();
    await expect(logo).toHaveValue(icon);
  }
  await page.setViewportSize({ width: 320, height: 720 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.locator('[data-look="default"]').click();
  await expect(style).toBeVisible();
  await expect(logo).toHaveValue("none");
});
