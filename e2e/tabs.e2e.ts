import { createHtmlRenderer } from "@comark/html";
import { expect, type Page, test } from "@playwright/test";
import tabs, { components } from "../packages/tabs/src/html.ts";

const render = createHtmlRenderer({ plugins: [tabs()], components });
// A page of its own for each case, on the docs site's origin so the tabs can save a choice. Not a docs page:
// `setContent` keeps the window, and with it the running script of a page that has tabs.
const open = async (page: Page, markdown: string, options: { script?: boolean } = {}) => {
  let html = await render(markdown);
  if (options.script === false) html = html.replace(/<script>[\s\S]*?<\/script>/g, "");
  await page.goto("/no-such-page");
  await page.setContent(
    `<!doctype html><html><body style="width:40rem;margin:2rem">${html}</body></html>`,
  );
};
const block = (label: string, sync = "") =>
  `::tabs${sync ? `{sync="${sync}"}` : ""}\n:::tabs-item{label="${label}"}\n${label} one\n:::\n\n:::tabs-item{label="B"}\n${label} two\n:::\n\n:::tabs-item{label="C"}\n${label} three\n:::\n::`;

test("a tab opens its panel, and the arrow keys, Home, and End move between tabs", async ({
  page,
}) => {
  await open(page, block("A"));
  const tab = (name: string) => page.getByRole("tab", { name });
  await expect(page.getByRole("tabpanel")).toContainText("A one");
  await tab("B").click();
  await expect(page.getByRole("tabpanel")).toContainText("A two");
  await expect(tab("B")).toHaveAttribute("aria-selected", "true");
  await expect(tab("A")).toHaveAttribute("tabindex", "-1");
  await page.keyboard.press("ArrowRight");
  await expect(tab("C")).toBeFocused();
  await expect(page.getByRole("tabpanel")).toContainText("A three");
  await page.keyboard.press("ArrowRight");
  await expect(tab("A")).toBeFocused();
  await page.keyboard.press("End");
  await expect(tab("C")).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Home");
  await expect(tab("A")).toHaveAttribute("tabindex", "0");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("tabpanel")).toBeFocused();
});

test("the open tab's surface slides over from the last one, and only fades with reduced motion", async ({
  page,
}) => {
  await open(page, block("A"));
  const surface = (name: string) =>
    page.getByRole("tab", { name }).evaluate((tab) =>
      tab
        .getAnimations({ subtree: true })
        .filter((animation) => !(animation instanceof CSSTransition))
        // SAFETY: every animation the script starts is a KeyframeEffect on the tab's `::before`.
        .flatMap((animation) =>
          Object.keys((animation.effect as KeyframeEffect).getKeyframes()[0] ?? {}),
        )
        .filter((key) => key === "transform" || key === "opacity"),
    );
  await page.getByRole("tab", { name: "C" }).click();
  expect(await surface("C")).toEqual(["transform"]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("tab", { name: "A" }).click();
  expect(await surface("A")).toEqual(["opacity"]);
});

test("synced blocks switch together, keep the clicked tab still, and remember the choice", async ({
  page,
}) => {
  const tall = `::tabs{sync="os"}\n:::tabs-item{label="A"}\n${"Tall\n\n".repeat(30)}:::\n\n:::tabs-item{label="B"}\nShort\n:::\n::`;
  await open(page, `${tall}\n\n${"Filler\n\n".repeat(30)}\n\n${block("A", "os")}`);
  await page.evaluate(() => localStorage.clear());
  const lower = page.locator(".ct").nth(1);
  const tab = lower.getByRole("tab", { name: "B" });
  await tab.scrollIntoViewIfNeeded();
  const before = await tab.evaluate((element) => element.getBoundingClientRect().top);
  await tab.click();
  await expect(page.locator(".ct").first().getByRole("tabpanel")).toContainText("Short");
  expect(
    Math.abs((await tab.evaluate((element) => element.getBoundingClientRect().top)) - before),
  ).toBeLessThan(2);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("comark-tabs:os"))).toBe("B");

  // A later page restores the choice, in blocks the script meets after it starts too.
  await open(page, `${block("A", "os")}\n\n${block("X", "os")}`);
  for (const root of await page.locator(".ct").all())
    await expect(root.getByRole("tab", { name: "B" })).toHaveAttribute("aria-selected", "true");
});

for (const colorScheme of ["light", "dark"] as const)
  test(`the open tab's surface is lighter than its strip in ${colorScheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await open(page, block("A"));
    const [surface, strip] = await page.locator(".ct").evaluate((root) => {
      // The strip is translucent, so it's measured over the background, as the page shows it.
      const canvas = document.createElement("canvas").getContext("2d")!;
      const paint = (...colors: string[]) => {
        for (const color of colors) {
          canvas.fillStyle = color;
          canvas.fillRect(0, 0, 1, 1);
        }
        const [r, g, b] = canvas.getImageData(0, 0, 1, 1).data;
        return r! + g! + b!;
      };
      const background = getComputedStyle(root).getPropertyValue("--_comark-background");
      const tab = root.querySelector(".ct-tab[aria-selected='true']")!;
      return [
        paint(background, getComputedStyle(tab, "::before").backgroundColor),
        paint(background, getComputedStyle(root.querySelector(".ct-list")!).backgroundColor),
      ];
    });
    expect(surface).toBeGreaterThan(strip!);
  });

test("without the script, every panel shows under its label", async ({ page }) => {
  await open(page, block("A"), { script: false });
  await expect(page.getByRole("tablist")).toBeHidden();
  await expect(page.locator(".ct-panel")).toHaveCount(3);
  for (const panel of await page.locator(".ct-panel").all()) await expect(panel).toBeVisible();
  await expect(page.locator(".ct-caption").nth(1)).toHaveText("B");
});
