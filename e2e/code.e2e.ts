import { createHtmlRenderer } from "@comark/html";
import { expect, type Page, test } from "@playwright/test";
import { onCodeAction } from "../packages/code/src/client.ts";
import code, { components } from "../packages/code/src/html.ts";
import tabs, { components as tabsComponents } from "../packages/tabs/src/html.ts";

const render = createHtmlRenderer({
  plugins: [code({ actions: [{ id: "run", label: "Run", languages: ["sh"] }] })],
  components,
});
// On the docs site's origin, a secure context, so the clipboard is there to grant.
const open = async (page: Page, markdown: string, options: { script?: boolean } = {}) => {
  let html = await render(markdown);
  if (options.script === false) html = html.replace(/<script>[\s\S]*?<\/script>/g, "");
  await page.goto("/no-such-page");
  await page.setContent(
    `<!doctype html><html><body style="width:30rem;margin:2rem"><style>pre{margin:1rem 0;padding:1rem;overflow-x:auto;background:#f4f4f5}</style>${html}</body></html>`,
  );
};
const long = `echo ${"word ".repeat(40)}`;
const sh = `\`\`\`sh\n${long}\n\`\`\``;

test("Copy writes the block's code to the clipboard and says so", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page, `${sh}\n\n\`\`\`ts\nconst a = 1\nconst b = 2\n\`\`\``);
  const block = page.locator(".ck").nth(1);
  await block.getByRole("button", { name: "Copy code" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "const a = 1\nconst b = 2",
  );
  await expect(block.getByRole("status")).toHaveText("Copied");
  await expect(block.locator(".ck-copy-done")).toBeVisible();
  // Empty, it's hidden, so it's out of the accessibility tree.
  await expect(block.locator(".ck-status")).toBeEmpty({ timeout: 3000 });
});

test("without the clipboard, Copy selects the code and says how to copy it", async ({ page }) => {
  await open(page, sh);
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { value: undefined }));
  await page.getByRole("button", { name: "Copy code" }).click();
  expect(await page.evaluate(() => getSelection()?.toString())).toBe(long);
  await expect(page.getByRole("status")).toContainText("Press Ctrl+C or ⌘C");
});

test("Wrap remembers the preference for every block and later pages", async ({ page }) => {
  await open(page, `${sh}\n\n${sh}`);
  const [first, second] = [page.locator(".ck pre").first(), page.locator(".ck pre").nth(1)];
  const overflows = (pre: typeof first) =>
    pre.evaluate((element) => element.scrollWidth > element.clientWidth);
  expect(await overflows(first)).toBe(true);
  const wrap = page.locator(".ck").first().getByRole("button", { name: "Wrap lines" });
  await wrap.click();
  await expect(wrap).toHaveAttribute("aria-pressed", "true");
  expect(await overflows(first)).toBe(false);
  expect(await overflows(second)).toBe(false);
  await expect(wrap).toBeVisible();
  await open(page, `${sh}\n\n${sh}`);
  await expect(wrap).toHaveAttribute("aria-pressed", "true");
  expect(await overflows(first)).toBe(false);
  expect(await overflows(second)).toBe(false);
  await wrap.click();
  await expect(wrap).toHaveAttribute("aria-pressed", "false");
  expect(await overflows(first)).toBe(true);
  expect(await overflows(second)).toBe(true);
  await open(page, sh.replace("```sh", "```sh wrap"));
  await expect(wrap).toHaveAttribute("aria-pressed", "false");
  expect(await overflows(first)).toBe(true);
});

test("Wrap appears only where unwrapped code overflows, including after resize and edits", async ({
  page,
}) => {
  await open(page, `${sh}\n\n\`\`\`ts\nconst a = 1\n\`\`\``);
  const first = page.locator(".ck").first().locator(".ck-wrap");
  const second = page.locator(".ck").nth(1).locator(".ck-wrap");
  await expect(first).toBeVisible();
  await expect(second).toBeHidden();
  await first.click();
  await expect(first).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(() => {
    document.body.style.width = "200rem";
  });
  await expect(first).toBeHidden();
  await page.evaluate(() => {
    document.body.style.width = "30rem";
  });
  await expect(first).toBeVisible();
  await expect(first).toHaveAttribute("aria-pressed", "true");
  await page
    .locator(".ck")
    .nth(1)
    .locator("code")
    .evaluate((element, text) => {
      element.textContent = text;
    }, long);
  await expect(second).toBeVisible();
  await expect(second).toHaveAttribute("aria-pressed", "true");
});

test("Wrap works when localStorage is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Blocked", "SecurityError");
      },
    });
  });
  await open(page, sh);
  const wrap = page.getByRole("button", { name: "Wrap lines" });
  await wrap.click();
  await expect(wrap).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("pre")).toHaveCSS("white-space", "pre-wrap");
  await wrap.click();
  await expect(wrap).toHaveAttribute("aria-pressed", "false");
});

test("an action sends the block's code and language to the page", async ({ page }) => {
  await open(page, `${sh}\n\n\`\`\`ts\nconst a = 1\n\`\`\``);
  await expect(page.locator(".ck").nth(1).getByRole("button", { name: "Run" })).toHaveCount(0);
  // `onCodeAction` uses nothing from outside its body, so its source runs on the page as it is.
  const detail = page.evaluate(
    `new Promise((resolve) => { const stop = (${onCodeAction.toString()})("run", (value) => { stop(); resolve(value) }) })`,
  );
  await page.getByRole("button", { name: "Run" }).click();
  expect(await detail).toEqual({ action: "run", code: long, language: "sh" });
});

test("the header sits above the first line, so its buttons never cover the code", async ({
  page,
}) => {
  // A terminal's header shows its title, not its language.
  const titled = sh.replace("```sh", '```sh title="Install"');
  await open(page, titled);
  const [copy, line] = await Promise.all(
    [".ck-copy", ".ck pre code"].map((selector) =>
      page.locator(selector).evaluate((element) => element.getBoundingClientRect()),
    ),
  );
  expect(copy.bottom).toBeLessThanOrEqual(line.top);
  await expect(page.locator(".ck-title")).toHaveText("Install");
  await expect(page.getByRole("button", { name: "Copy code" })).toBeVisible();
  // Chromium focuses a block that scrolls before the buttons that follow it.
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Run" })).toBeFocused();
  // Without the script the title stays and the buttons, which wouldn't work, are hidden.
  await open(page, titled, { script: false });
  await expect(page.locator(".ck-title")).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy code" })).toBeHidden();
});

test("a diff copies as the code after it, and a collapsed range opens on a click", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(
    page,
    '```diff lang="ts" collapse={2-3}\n function close() {\n   dialog.close();\n   scroll.restore();\n-  history.back();\n+  if (opened) history.back();\n }\n```',
  );
  const fold = page.locator(".ck-fold");
  await expect(fold.locator("summary")).toHaveText("2 collapsed lines");
  await expect(page.getByText("dialog.close();")).toBeHidden();
  await fold.locator("summary").click();
  await expect(page.getByText("dialog.close();")).toBeVisible();
  await expect(fold.locator("summary")).toBeHidden();
  await page.getByRole("button", { name: "Copy code" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "function close() {\n  dialog.close();\n  scroll.restore();\n  if (opened) history.back();\n}",
  );
  // Each line is one row: no empty rows between them, and a marked one is as tall as the rest.
  const heights = await page
    .locator(".ck .line")
    .evaluateAll((lines) => lines.map((line) => line.getBoundingClientRect().height));
  expect(new Set(heights).size).toBe(1);
});

test("a numbered line wraps under its own code", async ({ page }) => {
  await open(page, `\`\`\`ts wrap showLineNumbers\nconst a = "${"word ".repeat(30)}"\n\`\`\``);
  await expect(page.getByRole("button", { name: "Wrap lines" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const line = page.locator(".ck .line");
  const [box, padding] = await line.evaluate((element) => [
    element.getBoundingClientRect().height,
    Number.parseFloat(getComputedStyle(element).paddingLeft),
  ]);
  expect(box).toBeGreaterThan(40);
  expect(padding).toBeGreaterThan(0);
});

test("a block in a code group still hangs from the group's header", async ({ page }) => {
  const html = await createHtmlRenderer({
    plugins: [code(), tabs()],
    components: { ...tabsComponents, ...components },
  })("::code-group\n```sh [pnpm]\npnpm add x\n```\n\n```sh [npm]\nnpm i x\n```\n::");
  await page.goto("/no-such-page");
  await page.setContent(
    `<!doctype html><html><body style="width:30rem;margin:2rem"><style>pre{margin:1.25rem 0;padding:1rem;border-radius:8px}</style>${html}</body></html>`,
  );
  const [header, pre] = await Promise.all(
    [".ct-list", ".ct-panel:not([data-inactive]) pre"].map((selector) =>
      page.locator(selector).evaluate((element) => element.getBoundingClientRect()),
    ),
  );
  expect(Math.abs(pre.top - (header.bottom - 1))).toBeLessThan(1);
  await expect(page.locator(".ct-panel:not([data-inactive]) pre")).toHaveCSS(
    "border-top-left-radius",
    "0px",
  );
});

test.describe("touch targets", () => {
  test.use({ hasTouch: true });

  test("Wrap owns its visible face and extra vertical tap area", async ({ page }) => {
    await open(page, sh);
    expect(await page.evaluate(() => matchMedia("(pointer:coarse)").matches)).toBe(true);
    const wrap = page.getByRole("button", { name: "Wrap lines" });
    await expect(wrap).toBeVisible();
    const box = await wrap.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBe(24);
    expect(box!.width).toBe(24);
    // The old Copy target covered the rightmost 8px of Wrap.
    await page.touchscreen.tap(box!.x + box!.width - 2, box!.y + box!.height / 2);
    await expect(wrap).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".ck-status")).toBeEmpty();
    await page.touchscreen.tap(box!.x + box!.width / 2, box!.y - 8);
    await expect(wrap).toHaveAttribute("aria-pressed", "false");
  });
});
