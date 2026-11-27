import { createHtmlRenderer } from "@comark/html";
import { expect, type Page, test } from "@playwright/test";
import { onCodeAction } from "../packages/code/src/client.ts";
import code, { components } from "../packages/code/src/html.ts";
import magicMove, { components as magicMoveComponents } from "../packages/magic-move/src/html.ts";
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
const short = "echo 'Run the build before deploying now'";
const openFramed = async (page: Page, script = true, renderer = render) => {
  let html = await renderer(`\`\`\`sh\n${short}\n\`\`\``);
  if (!script) html = html.replace(/<script>[\s\S]*?<\/script>/g, "");
  await page.goto("/no-such-page");
  await page.setContent(`<!doctype html><meta name="viewport" content="width=device-width">
    <style>
      body{margin:0}
      .ck{margin-block:1.25rem;overflow:hidden;border-radius:10px;background:#f4f4f5}
      .ck>pre{margin:0;padding:.8rem .9rem;overflow-x:auto;font:13px/1.6 monospace}
    </style>${html}`);
};
const framedActions = [
  { id: "editor", label: "Open full example in editor" },
  { id: "download", label: "Download the complete example" },
  { id: "playground", label: "Open in playground" },
  { id: "terminal", label: "Run locally in your terminal" },
];
const openFramedActions = async (page: Page) => {
  await openFramed(
    page,
    true,
    createHtmlRenderer({ plugins: [code({ actions: framedActions })], components }),
  );
  await page.evaluate(() => {
    document.addEventListener("comark-code-action", (event) => {
      document.body.dataset.action = event.detail.action;
    });
  });
};

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

test("unrelated DOM updates do not remeasure code blocks", async ({ page }) => {
  await open(page, sh.replace("```sh", "```sh wrap"));
  await expect(page.locator(".ck-wrap")).toHaveAttribute("aria-pressed", "true");
  const measurements = await page.evaluate(async () => {
    const settle = async () => {
      for (let i = 0; i < 5; i++) await new Promise(requestAnimationFrame);
    };
    await settle();
    let changes = 0;
    const observer = new MutationObserver((records) => {
      changes += records.length;
    });
    observer.observe(document.querySelector(".ck")!, {
      attributes: true,
      attributeFilter: ["data-code-wrap"],
    });
    const unrelated = document.createElement("div");
    unrelated.style.position = "fixed";
    document.body.append(unrelated);
    unrelated.textContent = "Loading";
    await settle();
    unrelated.firstChild!.textContent = "Done";
    await settle();
    unrelated.remove();
    await settle();
    observer.disconnect();
    return changes;
  });
  expect(measurements).toBe(0);
});

test("inserted code blocks and character edits update Wrap", async ({ page }) => {
  await open(page, sh);
  await page.evaluate(() => {
    const container = document.createElement("section");
    const block = document.querySelector(".ck")!.cloneNode(true) as Element;
    block.removeAttribute("data-code-overflow");
    block.querySelector("code")!.textContent = "short";
    container.append(block);
    document.body.append(container);
  });
  const wrap = page.locator("section .ck-wrap");
  await expect(wrap).toBeHidden();
  await page.locator("section code").evaluate((element, text) => {
    element.firstChild!.textContent = text;
  }, long);
  await expect(wrap).toBeVisible();
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

test("without a title, the buttons float in the corner over the code, on hover and focus", async ({
  page,
}) => {
  await open(page, sh);
  const block = page.locator(".ck");
  const bar = block.locator(".ck-bar");
  const [pre, line, copy, surface] = await Promise.all(
    [".ck pre", ".ck pre code", ".ck-copy", ".ck-bar"].map((selector) =>
      page.locator(selector).evaluate((element) => element.getBoundingClientRect()),
    ),
  );
  // No header: the code starts at the host's own padding, and the buttons sit over it in the block's corner.
  expect(Math.abs(line.top - pre.top - 16)).toBeLessThan(1);
  expect(copy.top).toBeLessThan(line.bottom);
  expect(Math.abs(pre.right - copy.right - 6)).toBeLessThan(1);
  expect(Math.abs(copy.top - pre.top - 6)).toBeLessThan(1);
  await expect(block.locator(".ck-title")).toHaveCount(0);
  await expect(bar).toHaveCSS("border-bottom-width", "0px");
  // The buttons sit on the code block's surface, laid on the page's background and run to the block's edges, so no
  // code shows through them or between them and the edge.
  await expect(bar).toHaveCSS("background-image", /^linear-gradient\(rgb\(245, 245, 245\)/);
  await expect(bar).toHaveCSS("background-color", "rgb(255, 255, 255)");
  expect(Math.abs(surface.top - pre.top)).toBeLessThan(1);
  expect(Math.abs(surface.right - pre.right)).toBeLessThan(1);
  await page.mouse.move(0, 0);
  await expect(bar).toHaveCSS("opacity", "0");
  await block.hover();
  await expect(bar).toHaveCSS("opacity", "1");
  await page.mouse.move(0, 0);
  await expect(bar).toHaveCSS("opacity", "0");
  // Chromium focuses a block that scrolls before the buttons that follow it.
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Run" })).toBeFocused();
  await expect(bar).toHaveCSS("opacity", "1");
  // Without the script there are no buttons to show, so hovering shows nothing.
  await open(page, sh, { script: false });
  await page.locator(".ck").hover();
  await expect(page.locator(".ck-bar")).toHaveCSS("opacity", "0");
});

test("wrapped floating actions fit and work in a short clipped frame", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.setViewportSize({ width: 800, height: 600 });
  await openFramedActions(page);
  expect(await page.evaluate(() => matchMedia("(hover: hover)").matches)).toBe(true);
  const frame = page.locator(".ck");
  const bar = frame.locator(".ck-bar");
  const copy = frame.getByRole("button", { name: "Copy code" });
  await expect(copy).toBeVisible();
  const wideHeight = (await frame.boundingBox())!.height;
  await page.setViewportSize({ width: 390, height: 600 });
  await frame.hover();
  await expect(bar).toHaveCSS("opacity", "1");
  await expect.poll(async () => (await frame.boundingBox())!.height).toBeGreaterThan(wideHeight);
  const bounds = (await frame.boundingBox())!;
  const button = (await copy.boundingBox())!;
  expect(button.y).toBeGreaterThan(bounds.y + wideHeight);
  expect(button.y + button.height).toBeLessThanOrEqual(bounds.y + bounds.height);
  for (const { id, label } of framedActions) {
    await frame.getByRole("button", { name: label }).click();
    await expect(page.locator("body")).toHaveAttribute("data-action", id);
  }
  await copy.click();
  await expect(frame.getByRole("status")).toHaveText("Copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(short);
  await page.setViewportSize({ width: 800, height: 600 });
  await expect(frame.locator(".ck-status")).toBeEmpty({ timeout: 3000 });
  await expect.poll(async () => (await frame.boundingBox())!.height).toBe(wideHeight);
});

test("a clipped grid frame stays at one height when its floating actions wrap", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.setViewportSize({ width: 800, height: 600 });
  await openFramedActions(page);
  await page.addStyleTag({ content: ".ck{display:grid}" });
  const frame = page.locator(".ck");
  const bar = frame.locator(".ck-bar");
  const wideHeight = (await frame.boundingBox())!.height;
  await page.setViewportSize({ width: 390, height: 600 });
  await frame.hover();
  await expect(bar).toHaveCSS("opacity", "1");
  const heights = await frame.evaluate(async (element) => {
    const samples: number[] = [];
    for (let index = 0; index < 8; index++) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      samples.push(element.getBoundingClientRect().height);
    }
    return samples;
  });
  expect(Math.min(...heights)).toBeGreaterThan(wideHeight);
  expect(new Set(heights).size).toBe(1);
  await frame.getByRole("button", { name: "Copy code" }).click();
  await expect(frame.getByRole("status")).toHaveText("Copied");
  await page.setViewportSize({ width: 800, height: 600 });
  await expect(frame.locator(".ck-status")).toBeEmpty({ timeout: 3000 });
  await expect.poll(async () => (await frame.boundingBox())!.height).toBe(wideHeight);
});

test.describe("on a touch screen without hover", () => {
  test.use({ viewport: { width: 390, height: 600 }, hasTouch: true, isMobile: true });

  test("the action bar leaves the entire first line readable", async ({ page }) => {
    await openFramed(page);
    expect(await page.evaluate(() => matchMedia("(hover: none)").matches)).toBe(true);
    const bar = page.locator(".ck-bar");
    await expect(bar).toHaveCSS("opacity", "1");
    const pre = page.locator(".ck pre");
    expect(await pre.evaluate((el) => el.scrollWidth)).toBe(
      await pre.evaluate((el) => el.clientWidth),
    );
    const [code, controls] = await Promise.all([pre.boundingBox(), bar.boundingBox()]);
    expect(controls!.y).toBeGreaterThanOrEqual(code!.y + code!.height);
    await expect(bar.getByRole("button", { name: "Run" })).toBeVisible();
    await expect(bar.getByRole("button", { name: "Copy code" })).toBeVisible();
  });

  test("each wrapped action owns its visible face", async ({ page }) => {
    await openFramedActions(page);
    const boxes = await Promise.all(
      framedActions.map(({ label }) => page.getByRole("button", { name: label }).boundingBox()),
    );
    expect(new Set(boxes.map((box) => box!.y)).size).toBeGreaterThan(1);
    for (const [index, { id }] of framedActions.entries()) {
      const box = boxes[index]!;
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height - 2);
      await expect(page.locator("body")).toHaveAttribute("data-action", id);
    }
  });
});

test("without the script, dragging from beneath the invisible toolbar selects code", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await openFramed(page, false);
  const [code, bar] = await Promise.all(
    [".ck pre code", ".ck-bar"].map((selector) => page.locator(selector).boundingBox()),
  );
  const from = code!.x + code!.width - 1;
  expect(from).toBeGreaterThan(bar!.x);
  const middle = code!.y + code!.height / 2;
  await page.mouse.move(from, middle);
  await page.mouse.down();
  await page.mouse.move(code!.x, middle, { steps: 8 });
  await page.mouse.up();
  expect(await page.evaluate(() => getSelection()?.toString())).toBe(short);
});

for (const success of [true, false]) {
  test(`Copy ${success ? "confirmation" : "instructions"} fit inside a short clipped frame`, async ({
    page,
    context,
  }) => {
    if (success) await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.setViewportSize({ width: 390, height: 600 });
    await openFramed(page);
    await page.addStyleTag({ content: ".ck>pre{margin-block-start:1.25rem}" });
    if (!success) {
      await page.evaluate(() =>
        Object.defineProperty(navigator, "clipboard", { value: undefined }),
      );
    }
    const trigger = page.getByRole("button", { name: "Copy code" });
    const before = await trigger.boundingBox();
    await trigger.click();
    await page.mouse.move(0, 0);
    await expect(page.getByRole("status")).toContainText(success ? "Copied" : "Press Ctrl+C or ⌘C");
    await expect(page.locator(".ck-bar")).toHaveCSS("opacity", "1");
    const [copy, status, frame] = await Promise.all(
      [".ck-copy", ".ck-status", ".ck"].map((selector) =>
        page.locator(selector).evaluate((element) => element.getBoundingClientRect()),
      ),
    );
    expect(copy.top).toBeCloseTo(before!.y);
    expect(copy.left).toBeCloseTo(before!.x);
    expect(status.top).toBeGreaterThan(copy.bottom);
    expect(Math.abs(status.right - copy.right)).toBeLessThan(1);
    expect(status.left).toBeGreaterThanOrEqual(frame.left);
    expect(status.bottom).toBeLessThanOrEqual(frame.bottom);
    if (success) {
      await expect(page.locator(".ck-status")).toBeEmpty();
      const after = await trigger.boundingBox();
      expect(after!.y).toBeCloseTo(before!.y);
      expect(after!.x).toBeCloseTo(before!.x);
    }
  });
}

test("a titled block's header sits above the first line, so its buttons never cover the code", async ({
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

test("opening a folded range opens it at once, with the following lines below its lines", async ({
  page,
}) => {
  await open(page, "```ts collapse={2-4}\nfirst()\nsecond()\nthird()\nfourth()\nlast()\n```");
  await page.addStyleTag({ content: "pre{font:16px/24px monospace}" });
  const fold = page.locator(".ck-fold");
  const opened = await fold.evaluate(async (element) => {
    const following = element.nextElementSibling!;
    const closed = element.getBoundingClientRect().height;
    const followingTop = following.getBoundingClientRect().top;
    element.querySelector("summary")!.click();
    // The first layout after the click, and one a frame later: the content reads at once and stays put.
    const first = {
      height: element.getBoundingClientRect().height,
      followingTop: following.getBoundingClientRect().top,
    };
    await new Promise(requestAnimationFrame);
    const later = {
      height: element.getBoundingClientRect().height,
      followingTop: following.getBoundingClientRect().top,
    };
    return { closed, followingTop, first, later };
  });
  for (const at of [opened.first, opened.later]) {
    expect(at.height).toBe(3 * opened.closed);
    expect(at.followingTop).toBe(opened.followingTop + 2 * opened.closed);
  }
  await expect(fold.locator("summary")).toBeHidden();
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

for (const [name, markdown] of [
  ["a code group", "::code-group\n```sh [pnpm]\npnpm add x\n```\n\n```sh [npm]\nnpm i x\n```\n::"],
  ["a magic move", "::magic-move\n```sh [pnpm]\npnpm add x\n```\n\n```sh [npm]\nnpm i x\n```\n::"],
] as const)
  test(`in ${name}, the block hangs from the header, which holds its buttons`, async ({ page }) => {
    const html = await createHtmlRenderer({
      plugins: [code(), tabs(), magicMove()],
      components: { ...tabsComponents, ...magicMoveComponents, ...components },
    })(markdown);
    await page.goto("/no-such-page");
    await page.setContent(
      `<!doctype html><html><body style="width:30rem;margin:2rem"><style>pre{margin:1.25rem 0;padding:1rem;border-radius:8px}</style>${html}</body></html>`,
    );
    const shown = ":is(.ct-panel,.cmv-step):not([data-inactive])";
    const [header, pre, line, copy] = await Promise.all(
      ["[role=tablist]", `${shown} pre`, `${shown} code`, `${shown} .ck-copy`].map((selector) =>
        page.locator(selector).evaluate((element) => element.getBoundingClientRect()),
      ),
    );
    expect(Math.abs(pre.top - (header.bottom - 1))).toBeLessThan(1);
    await expect(page.locator(`${shown} pre`)).toHaveCSS("border-top-left-radius", "0px");
    // The code starts at the host's own padding: the block makes no room for a header of its own.
    expect(Math.abs(line.top - pre.top - 16)).toBeLessThan(1);
    await expect(page.locator(`${shown} .ck-copy`)).toBeVisible();
    expect(Math.abs(copy.top + copy.height / 2 - (header.top + header.height / 2))).toBeLessThan(1);
    expect(pre.right - copy.right).toBeLessThan(8);
    await expect(page.locator(`${shown} .ck-title`)).toBeHidden();
  });

for (const container of ["code-group", "magic-move"])
  for (const count of [1, 8])
    test(`${container} keeps ${count} labeled actions outside overflowing tabs`, async ({
      page,
      context,
    }) => {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      const markdown = `::${container}\n${Array.from(
        { length: 8 },
        (_, i) => `\`\`\`sh [Install with package manager ${i + 1}]\n${long}\n\`\`\``,
      ).join("\n\n")}\n::`;
      const html = await createHtmlRenderer({
        plugins: [
          code({
            actions: Array.from({ length: count }, (_, i) => ({
              id: `run-${i}`,
              label: `Run in terminal ${i + 1}`,
            })),
          }),
          tabs(),
          magicMove(),
        ],
        components: { ...tabsComponents, ...magicMoveComponents, ...components },
      })(markdown);
      await page.goto("/no-such-page");
      await page.setContent(
        `<!doctype html><html><body style="width:30rem;margin:2rem"><style>pre{margin:0;padding:1rem;overflow-x:auto}.cmv-step{min-width:0}</style>${html}</body></html>`,
      );
      const strip = page.getByRole("tablist");
      const bar = page.locator(":is(.ct-panel,.cmv-step):not([data-inactive]) .ck-bar");
      await expect(
        bar.getByRole("button", { name: "Run in terminal 1", exact: true }),
      ).toBeVisible();
      await expect
        .poll(async () => {
          const [tabs, controls] = await Promise.all([strip.boundingBox(), bar.boundingBox()]);
          return tabs!.x + tabs!.width - controls!.x;
        })
        .toBeLessThanOrEqual(0);
      expect(await strip.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(
        true,
      );
      await strip.evaluate((element) => {
        element.scrollLeft = element.scrollWidth;
      });
      const last = strip.getByRole("tab").last();
      await last.click();
      await expect(last).toHaveAttribute("aria-selected", "true");
      await expect
        .poll(async () => {
          const [tabs, controls] = await Promise.all([strip.boundingBox(), bar.boundingBox()]);
          return tabs!.x + tabs!.width - controls!.x;
        })
        .toBeLessThanOrEqual(0);
      // Both the start and end of the scroller stay independently clickable.
      await strip.evaluate((element) => {
        element.scrollLeft = 0;
      });
      await strip.getByRole("tab").first().click();
      await expect(strip.getByRole("tab").first()).toHaveAttribute("aria-selected", "true");
      await page.evaluate(() => {
        document.body.style.width = "20rem";
        document.addEventListener("comark-code-action", (event) => {
          document.body.dataset.action = event.detail.action;
        });
      });
      await expect
        .poll(async () => {
          const [tabs, controls] = await Promise.all([strip.boundingBox(), bar.boundingBox()]);
          return tabs!.x + tabs!.width - controls!.x;
        })
        .toBeLessThanOrEqual(0);
      await bar.getByRole("button", { name: `Run in terminal ${count}`, exact: true }).click();
      await expect(page.locator("body")).toHaveAttribute("data-action", `run-${count - 1}`);
      await bar.getByRole("button", { name: "Wrap lines" }).click();
      await expect(bar.getByRole("button", { name: "Wrap lines" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await bar.getByRole("button", { name: "Copy code" }).click();
      await expect(page.getByRole("status").filter({ hasText: "Copied" })).toBeVisible();
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(long);
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
    const wrappedBox = (await wrap.boundingBox())!;
    await page.touchscreen.tap(wrappedBox.x + wrappedBox.width / 2, wrappedBox.y - 8);
    await expect(wrap).toHaveAttribute("aria-pressed", "false");
  });
});
