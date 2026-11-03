import { createHtmlRenderer } from "@comark/html";
import { expect, type Page, test } from "@playwright/test";
import shiki from "comark/plugins/shiki";
import code, { components as codeComponents } from "../packages/code/src/html.ts";
import tabs, { components } from "../packages/tabs/src/html.ts";

const render = createHtmlRenderer({
  plugins: [tabs(), shiki(), code()],
  components: { ...components, ...codeComponents },
});
const group = (props = "magic") =>
  `::code-group{${props}}\n\`\`\`ts [tinyaml] del={1} ins={2}\nimport yaml from "js-yaml";\nimport yaml from "tinyaml/js-yaml";\n\`\`\`\n\n\`\`\`ts [tinyjson5] del={1} ins={2}\nimport JSON5 from "json5";\nimport JSON5 from "tinyjson5/json5";\n\`\`\`\n\n\`\`\`ts [tinyini] del={1} ins={2}\nimport ini from "ini";\nimport ini from "tinyini/ini";\n\`\`\`\n::`;
const open = async (page: Page, markdown = group(), script = true) => {
  const html = await render(markdown);
  await page.goto("/no-such-page");
  await page.setContent(
    `<!doctype html><html><body style="width:40rem;margin:2rem"><style>pre{font:14px/24px monospace;padding:16px;background:#f6f6f6}</style>${script ? html : html.replace(/<script>[\s\S]*?<\/script>/g, "")}</body></html>`,
  );
};
const animations = (page: Page) =>
  page
    .getByRole("tabpanel")
    .locator("pre")
    .evaluate((pre) =>
      pre.getAnimations({ subtree: true }).flatMap((animation) => {
        const effect = animation.effect;
        return effect instanceof KeyframeEffect
          ? [
              {
                text: effect.target?.textContent,
                moves: effect.getKeyframes().some((frame) => frame.transform),
              },
            ]
          : [];
      }),
    );

test("opted-in code groups move shared highlighted tokens and preserve diff lines and copy text", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  await page.getByRole("tab", { name: "tinyini" }).evaluate((tab) => {
    tab.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    for (const animation of document.getAnimations()) animation.pause();
  });
  expect(await animations(page)).toEqual(
    expect.arrayContaining([
      { text: "from", moves: true },
      { text: "ini", moves: false },
    ]),
  );
  const panel = page.getByRole("tabpanel");
  await expect(panel.locator(".ck-del")).toHaveText('import ini from "ini";');
  await expect(panel.locator(".ck-ins")).toHaveText('import ini from "tinyini/ini";');
  await expect(panel.locator("pre.shiki")).toBeVisible();
  await expect(page.locator(".ct-ghost").first()).toHaveAttribute("aria-hidden", "true");
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) animation.finish();
  });
  await panel.getByRole("button", { name: "Copy code", exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    'import ini from "tinyini/ini";',
  );
  await expect(page.locator(".ct-ghost")).toHaveCount(0);
  await open(page, group(), false);
  await expect(page.getByRole("tablist")).toBeHidden();
  await expect(page.getByRole("tabpanel")).toHaveCount(3);
  for (const panel of await page.getByRole("tabpanel").all()) await expect(panel).toBeVisible();
  await expect(page.locator(".ct-t")).toHaveCount(0);
});

test("code movement is off by default and skips keyboard navigation and reduced motion", async ({
  page,
}) => {
  await open(page, group(""));
  await page.getByRole("tab", { name: "tinyini" }).click();
  await expect(page.getByRole("tabpanel")).toContainText('import ini from "tinyini/ini";');
  await expect(page.locator(".ct-t")).toHaveCount(0);

  await open(page);
  await page.getByRole("tab", { name: "tinyini" }).evaluate((tab) => {
    tab.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    for (const animation of document.getAnimations()) animation.pause();
  });
  expect((await animations(page)).length).toBeGreaterThan(0);
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) animation.finish();
  });
  await page.getByRole("tab", { name: "tinyini" }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("tab", { name: "tinyjson5" })).toBeFocused();
  await expect(page.getByRole("tabpanel")).toContainText('import JSON5 from "tinyjson5/json5";');
  expect(await animations(page)).toEqual([]);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("tab", { name: "tinyini" }).click();
  await expect(page.getByRole("tabpanel")).toContainText('import ini from "tinyini/ini";');
  expect(await animations(page)).toEqual([]);
  await expect(page.locator(".ct-ghost")).toHaveCount(0);
});

test("synced magic groups settle rapid switches and restore saved code without movement", async ({
  page,
}) => {
  const source = `${group('magic sync="imports"')}\n\n${group('magic sync="imports"')}`;
  await open(page, source);
  await page
    .locator(".ct")
    .first()
    .getByRole("tab", { name: "tinyjson5" })
    .evaluate((tab) => {
      tab.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
      tab.nextElementSibling?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
      for (const animation of document.getAnimations()) animation.pause();
    });
  expect(
    await page
      .locator(".ct")
      .evaluateAll((roots) =>
        roots.every(
          (root) =>
            root
              .querySelector(".ct-panel:not([data-inactive]) pre")
              ?.getAnimations({ subtree: true }).length,
        ),
      ),
  ).toBe(true);
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) animation.finish();
  });
  for (const root of await page.locator(".ct").all()) {
    await expect(root.getByRole("tabpanel")).toContainText('import ini from "tinyini/ini";');
    await expect(root.getByRole("tab", { name: "tinyini" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  }
  await expect(page.locator(".ct-ghost")).toHaveCount(0);
  await expect(page.locator("[data-moving]")).toHaveCount(0);
  await open(page, source);
  for (const root of await page.locator(".ct").all())
    await expect(root.getByRole("tabpanel")).toContainText('import ini from "tinyini/ini";');
  await expect(page.locator(".ct-t")).toHaveCount(0);
});
