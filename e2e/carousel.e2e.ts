import { createHtmlRenderer } from "@comark/html";
import { expect, type Page, test } from "@playwright/test";
import carousel, { components } from "../packages/carousel/src/html.ts";
import zoom, { components as zoomComponents } from "../packages/zoom/src/html.ts";

const render = createHtmlRenderer({
  plugins: [carousel(), zoom()],
  components: { ...components, ...zoomComponents },
});
// A page of its own for each case, rendered the way the docs render, at a width where three columns fit.
const open = async (
  page: Page,
  markdown: string,
  options: { dir?: string; script?: boolean } = {},
) => {
  let html = await render(markdown);
  if (options.script === false) html = html.replace(/<script>[\s\S]*?<\/script>/g, "");
  await page.setContent(
    `<!doctype html><html dir="${options.dir ?? "ltr"}"><style>body{width:48rem;margin:2rem}pre{overflow-x:auto}</style><body>${html}</body></html>`,
  );
};
const three = '::carousel{title="Tour"}\nOne\n\nTwo\n\nThree\n::';
const parts = (page: Page, title = "Tour") => {
  const root = page.locator(`.cc[aria-label="${title}"]`);
  const controls = root.locator(":scope>.cc-controls");
  return {
    root,
    track: root.locator(":scope>.cc-track"),
    count: controls.locator(".cc-count"),
    prev: controls.getByRole("button", { name: "Previous slide" }),
    next: controls.getByRole("button", { name: "Next slide" }),
  };
};

test("a carousel pages with its arrows, and its zoomed view keeps the carousel in step", async ({
  page,
}) => {
  await page.goto("/carousel/");
  const carousel = page.locator("main .cc").first();
  const current = carousel.locator(".cc-count");

  await expect(current).toHaveText("1 / 3");
  await carousel.getByRole("button", { name: "Next slide" }).click();
  await expect(current).toHaveText("2 / 3");

  await carousel.locator(".cc-slide").nth(1).click();
  await expect(page.locator(".cz-count")).toHaveText("2 / 3");
  await expect(page.locator(".cz-thumb")).toHaveCount(3);
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".cz-count")).toHaveText("3 / 3");
  await expect(current).toHaveText("3 / 3");
  await page.keyboard.press("Escape");
  await expect(page.locator(".cz-dialog")).toHaveCount(0);
});

test("a carousel inside a slide leaves the outer counter and arrows to the outer carousel", async ({
  page,
}) => {
  await open(
    page,
    '::carousel{title="Outer"}\n:::slide\nOne\n:::\n\n:::slide\n::::carousel{title="Inner"}\nA\n\nB\n::::\n:::\n\n:::slide\nThree\n:::\n::',
  );
  const outer = parts(page, "Outer");
  const inner = parts(page, "Inner");
  await outer.next.click();
  await expect(outer.count).toHaveText("2 / 3");
  await expect(outer.prev).toHaveAttribute("aria-disabled", "false");
  await expect(inner.count).toHaveText("1 / 2");
  await inner.next.click();
  await expect(inner.count).toHaveText("2 / 2");
  await expect(outer.count).toHaveText("2 / 3");
});

test("quick clicks add up", async ({ page }) => {
  await open(page, three);
  const { count, next } = parts(page);
  await next.click();
  await next.click();
  await expect(count).toHaveText("3 / 3");
});

test("quick clicks add up in a browser without scrollend", async ({ page }) => {
  await page.evaluate(() => {
    Reflect.deleteProperty(window, "onscrollend");
    Reflect.deleteProperty(Window.prototype, "onscrollend");
  });
  expect(await page.evaluate(() => "onscrollend" in window)).toBe(false);
  await open(page, three);
  const { count, next, prev } = parts(page);
  await next.click();
  await next.click();
  await expect(count).toHaveText("3 / 3");
  // Once the track settles, the next click reads the position again.
  await expect(next).toHaveAttribute("aria-disabled", "true");
  await prev.click();
  await expect(count).toHaveText("2 / 3");
});

test("a carousel after the script, shown later, still syncs", async ({ page }) => {
  await open(
    page,
    `${three}\n\n::div{hidden}\n:::carousel{title="Later"}\nOne\n\nTwo\n\nThree\n:::\n::`,
  );
  const later = parts(page, "Later");
  await expect(later.root).toBeHidden();
  await page.locator("div[hidden]").evaluate((element) => element.removeAttribute("hidden"));
  await expect(later.next).toHaveAttribute("aria-disabled", "false");
  await later.next.click();
  await expect(later.count).toHaveText("2 / 3");
});

test("paging jumps when the reader prefers reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, three);
  const scrolled = await parts(page).track.evaluate((element) => {
    element.parentElement?.querySelector<HTMLElement>("[data-carousel-step='1']")?.click();
    return element.scrollLeft;
  });
  expect(scrolled).toBeGreaterThan(0);
});

test("the end of a track with several columns counts as the last slide", async ({ page }) => {
  await open(page, '::carousel{title="Tour" columns=2}\nOne\n\nTwo\n\nThree\n::');
  const { count, next, prev } = parts(page);
  await next.click();
  await expect(count).toHaveText("3 / 3");
  await expect(next).toHaveAttribute("aria-disabled", "true");
  await prev.click();
  await expect(count).toHaveText("1 / 3");
});

test("a right-to-left carousel pages in its reading direction", async ({ page }) => {
  await open(page, three, { dir: "rtl" });
  const { count, next, prev, root } = parts(page);
  await expect(next.locator("svg")).toHaveCSS("scale", "-1 1");
  await next.click();
  await expect(count).toHaveText("2 / 3");
  await expect(prev).toHaveAttribute("aria-disabled", "false");
  await root.locator(".cc-slide").nth(1).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(count).toHaveText("3 / 3");
  await expect(next).toHaveAttribute("aria-disabled", "true");
});

test("a disabled arrow keeps focus, and the keys keep paging", async ({ page }) => {
  await open(page, three);
  const { count, next } = parts(page);
  await next.focus();
  await page.keyboard.press("Enter");
  await expect(count).toHaveText("2 / 3");
  await page.keyboard.press("Enter");
  await expect(next).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Enter");
  await expect(count).toHaveText("3 / 3");
  await expect(next).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(count).toHaveText("2 / 3");
});

test("the arrow keys leave modifiers and a wide code block alone", async ({ page }) => {
  await open(
    page,
    `::carousel{title="Tour"}\n\`\`\`ts\nconst wide = "${"x".repeat(300)}"\n\`\`\`\n\nTwo\n::`,
  );
  const { count, root } = parts(page);
  // The carousel claims a key by preventing its default; a listener on the window hears after it.
  await page.evaluate(() => {
    const claimed: boolean[] = [];
    Object.assign(window, { claimed });
    window.addEventListener("keydown", (event) => {
      if (event.key.startsWith("Arrow")) claimed.push(event.defaultPrevented);
    });
  });
  const claimed = () => page.evaluate(() => (window as unknown as { claimed: boolean[] }).claimed);
  const slide = root.locator(".cc-slide").first();
  await slide.focus();
  for (const key of ["Alt+ArrowRight", "Control+ArrowRight", "Shift+ArrowRight"])
    await page.keyboard.press(key);
  const code = slide.locator("pre");
  await code.evaluate((element) => (element.tabIndex = 0));
  await code.focus();
  await page.keyboard.press("ArrowRight");
  const combobox = slide.locator("[role=combobox]");
  await slide.evaluate((element) => {
    const box = document.createElement("div");
    box.setAttribute("role", "combobox");
    box.tabIndex = 0;
    element.append(box);
  });
  await combobox.focus();
  await page.keyboard.press("ArrowRight");
  expect(await claimed()).toEqual([false, false, false, false, false]);
  await slide.focus();
  await page.keyboard.press("ArrowRight");
  await expect(count).toHaveText("2 / 2");
  expect(await claimed()).toEqual([false, false, false, false, false, true]);
});

test("a zoomable slide shows its whole focus ring", async ({ page }) => {
  await open(page, three);
  const slide = parts(page).root.locator(".cc-slide").first();
  await page.keyboard.press("Tab");
  await expect(slide).toBeFocused();
  await expect(slide).toHaveCSS("outline-offset", "-2px");
});

test("without the script, the scrollbar reaches the other slides", async ({ page }) => {
  await open(page, three, { script: false });
  const { track } = parts(page);
  const bar = (element: HTMLElement) => element.offsetHeight - element.clientHeight;
  expect(await track.evaluate(bar)).toBeGreaterThan(0);
  await open(page, three);
  expect(await track.evaluate(bar)).toBe(0);
});

test("a short slide starts at the top, where a taller one does", async ({ page }) => {
  await open(page, '::carousel{title="Tour"}\nShort\n\n- One\n- Two\n- Three\n- Four\n::');
  const starts = await parts(page)
    .track.locator(".cc-slide")
    .evaluateAll((slides) =>
      slides.map(
        (slide) =>
          slide.firstElementChild!.getBoundingClientRect().top - slide.getBoundingClientRect().top,
      ),
    );
  expect(starts).toHaveLength(2);
  expect(starts[0]).toBe(starts[1]);
});
