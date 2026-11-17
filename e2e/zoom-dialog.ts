import { createHtmlRenderer } from "@comark/html";
import { expect, type Page, test } from "@playwright/test";
import carousel, { components as carouselComponents } from "../packages/carousel/src/html.ts";
import zoom, { components as zoomComponents } from "../packages/zoom/src/html.ts";
import sources, { components as sourceComponents } from "../packages/sources/src/html.ts";
import code, { components as codeComponents } from "../packages/code/src/html.ts";
import { fixture } from "./helpers.ts";

// The zoom is a native modal <dialog>. Each browser file runs these, since the top layer, `cancel`, and focus on
// close are the browser's.

const render = createHtmlRenderer({
  plugins: [carousel(), zoom()],
  components: { ...carouselComponents, ...zoomComponents },
});

const filler = "Pigeons home from far away. ".repeat(300);
const image = `[Skip to the end](#end)\n\n![Office correlations dashboard](/dashboard.png)\n\n${filler}`;
const gallery = `[Skip to the end](#end)\n\n::carousel{title="Filters"}\n![Filter toolbar wrapping](/before.png)\n\n![Filter toolbar on one row](/after.png)\n::\n\n${filler}`;

// Records the animations running once the zoom has opened, and once Escape has started closing it, by the class of
// the element each runs on. The cancel listener goes on after the zoom's own, so it runs after the close has begun.
async function recordAnimations(page: Page) {
  await page.evaluate(() => {
    const seen: string[] = [];
    Object.assign(window, { animated: seen });
    const record = () => {
      for (const animation of document.getAnimations())
        if (animation.effect instanceof KeyframeEffect && animation.effect.target)
          seen.push(animation.effect.target.className);
    };
    document.addEventListener("comark-zoom:open", ({ detail }) => {
      record();
      detail.dialog.addEventListener("cancel", record);
    });
  });
}

const animated = (page: Page) =>
  page.evaluate(() => {
    const seen = (window as Window & { animated?: string[] }).animated ?? [];
    return seen.splice(0);
  });

const settle = (page: Page) =>
  page.evaluate(() => {
    for (const animation of document.getAnimations()) animation.finish();
  });

export function dialogTests() {
  test("citation cards stay interactive in zoom and return to the page after close", async ({
    page,
  }) => {
    const renderContent = createHtmlRenderer({
      plugins: [zoom(), sources()],
      components: { ...zoomComponents, ...sourceComponents },
    });
    await fixture(
      page,
      await renderContent(
        '::zoom{title="Evidence"}\nPigeons navigate :cite[1].\n::\n\nOutside :cite[1].\n\n::sources\n1. [Magnetoreception](https://example.com/magnetoreception)\n::',
      ),
    );
    const outside = page.locator("main > p .cso-cite a");
    await outside.hover();
    const card = page.locator(".cso-card");
    await expect(card).toBeVisible();
    await page.mouse.move(0, 0);
    await page.locator("main [data-zoom]").first().click();
    await settle(page);
    await page.locator(".cz-dialog .cso-cite a").hover();
    await expect(page.locator(".cz-dialog .cso-card")).toBeVisible();
    await card.hover();
    await expect(card).toBeVisible();
    await card.locator("a").focus();
    await expect(card.locator("a")).toBeFocused();
    await card.locator("a").evaluate((node) =>
      node.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          node.setAttribute("data-clicked", "");
        },
        { once: true },
      ),
    );
    await card.locator("a").click();
    await expect(card.locator("a")).toHaveAttribute("data-clicked", "");
    await page.locator(".cz-close").click();
    await expect(page.locator(".cz-dialog")).toHaveCount(0);
    await expect(card).toHaveCount(0);
    await outside.hover();
    await expect(card).toBeVisible();
    await card.hover();
    await expect(card).toBeVisible();
  });

  test("clipboard failure selects code inside the modal", async ({ page }) => {
    const renderContent = createHtmlRenderer({
      plugins: [zoom(), code()],
      components: { ...zoomComponents, ...codeComponents },
    });
    await fixture(page, await renderContent('::zoom{title="Code"}\n```sh\necho pigeons\n```\n::'));
    await page.evaluate(() =>
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: () => Promise.reject(new Error("denied")) },
        configurable: true,
      }),
    );
    await page.locator("main [data-zoom]").first().click();
    await settle(page);
    await page
      .locator(".cz-dialog")
      .getByRole("button", { name: "Copy code", exact: true })
      .click();
    const field = page.locator(".cz-dialog textarea");
    await expect(field).toBeFocused();
    expect(
      await field.evaluate((node: HTMLTextAreaElement) =>
        node.value.slice(node.selectionStart, node.selectionEnd),
      ),
    ).toBe("echo pigeons");
    await page.evaluate(() => document.dispatchEvent(new Event("copy")));
    await expect(field).toHaveCount(0);
  });

  test("the zoom opens as a modal dialog in the top layer, and the page behind it is inert", async ({
    page,
  }) => {
    // A widget at the highest z-index, as a page's own toolbar or chat bubble may be, sits under the top layer.
    await fixture(
      page,
      `<button class="widget" type="button">Chat</button>${await render(gallery)}`,
      "main{width:600px;margin:auto}img{max-width:100%}.widget{position:fixed;top:1rem;right:1rem;z-index:2147483647}",
    );
    await page.locator("main .cc-slide").first().click();
    const dialog = page.locator(".cz-dialog");
    await expect(dialog).toBeFocused();

    const widget = page.locator(".widget");
    const covered = await widget.evaluate((node) => {
      const box = node.getBoundingClientRect();
      return !node.contains(
        document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2),
      );
    });
    expect(covered).toBe(true);

    const link = page.locator("main a").first();
    await link.evaluate((node) => (node as HTMLElement).focus());
    await expect(dialog).toBeFocused();
    for (let step = 0; step < 8; step++) {
      await page.keyboard.press("Tab");
      await expect(link).not.toBeFocused();
      await expect(widget).not.toBeFocused();
    }
    expect(await dialog.evaluate((node) => node.matches("dialog:modal"))).toBe(true);
  });

  test("opening and closing animate the copy between the page and the stage, and the page doesn't scroll", async ({
    page,
  }) => {
    await fixture(page, await render(image));
    await recordAnimations(page);
    const picture = page.locator("main img[data-zoom]");
    await picture.click();
    const dialog = page.locator(".cz-dialog");
    await expect(dialog).toBeVisible();
    expect(await animated(page)).toEqual(
      expect.arrayContaining(["cz-item", "cz-backdrop", "cz-header"]),
    );
    await settle(page);

    const top = await page.evaluate(() => scrollY);
    await page.mouse.move(640, 360);
    await page.mouse.wheel(0, 600);
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(top);
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe("hidden");

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    expect(await animated(page)).toEqual(expect.arrayContaining(["cz-item", "cz-backdrop"]));
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe("");
    await expect(picture).toBeFocused();
  });

  test("Escape closes a zoom opened from the keyboard, and focus returns to the item", async ({
    page,
  }) => {
    await fixture(page, await render(gallery));
    const slide = page.locator("main .cc-slide").first();
    await slide.focus();
    await page.keyboard.press("Enter");
    const dialog = page.locator(".cz-dialog");
    await expect(dialog).toBeFocused();
    await page.locator(".cz-thumb").last().focus();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(slide).toBeFocused();
    await expect(page).toHaveURL(/\/fixture\/$/);
  });

  test("a zoom opened without a click or key still closes on Escape and puts the page back", async ({
    page,
  }) => {
    await fixture(page, await render(image));
    const picture = page.locator("main img[data-zoom]");
    await picture.evaluate((node) => (node as HTMLElement).click());
    const dialog = page.locator(".cz-dialog");
    await expect(dialog).toBeVisible();
    await settle(page);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(picture).toHaveCSS("visibility", "visible");
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe("");
    await expect(page).toHaveURL(/\/fixture\/$/);
  });

  test("a click on the backdrop closes the zoom, and a click on the copy doesn't", async ({
    page,
  }) => {
    await fixture(page, await render(image));
    const picture = page.locator("main img[data-zoom]");
    await picture.click();
    const dialog = page.locator(".cz-dialog");
    await expect(dialog).toBeVisible();
    await settle(page);
    await page.locator(".cz-item").click();
    await expect(dialog).toBeVisible();
    await page.mouse.click(8, 400);
    await expect(dialog).toHaveCount(0);
    await expect(picture).toBeFocused();
  });

  test("the close button closes the zoom, and focus returns to the item", async ({ page }) => {
    await fixture(page, await render(gallery));
    const slide = page.locator("main .cc-slide").first();
    await slide.click();
    await page.locator(".cz-close").click();
    await expect(page.locator(".cz-dialog")).toHaveCount(0);
    await expect(slide).toBeFocused();
  });
}
