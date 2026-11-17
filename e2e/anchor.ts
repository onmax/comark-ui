import { createHtmlRenderer } from "@comark/html";
import { expect, type Page, test } from "@playwright/test";
import sources, { components } from "../packages/sources/src/html.ts";
import { componentViewCss } from "../packages/ui/src/editor/component-view.ts";

// The popovers CSS anchor positioning places: comark-sources' citation card and the editor's props panel. Chromium and
// Firefox (147 and later) both run them, each from its own file, since a file runs in one browser.
// Engines round a popover's edges differently, so a placement holds to the pixel.
const near = (actual: number, expected: number) =>
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(1);

export function anchoredPopovers() {
  test.use({ viewport: { width: 800, height: 600 } });

  const render = createHtmlRenderer({ plugins: [sources()], components });
  const markdown = [
    "By the sun :cite[1], and by smell :cite[2].",
    "::sources\n1. [Magnetoreception](https://en.wikipedia.org/wiki/Magnetoreception), on the sun\n2. [Homing](https://example.com/homing)\n::",
  ].join("\n\n");
  const cite = (page: Page, n: number) => page.locator(`.cso-cite a[href="#cso-${n}"]`).first();
  // The document with its top-left corner where `style` puts it.
  const at = async (page: Page, style: string, before = "") =>
    page.setContent(
      `<!doctype html><html><body style="margin:0"><div style="position:absolute;width:30rem;${style}">${before}${await render(markdown)}</div></body></html>`,
    );
  const card = async (page: Page, n: number) => {
    await cite(page, n).hover();
    const shown = page.locator(".cso-card");
    // It grows in, so it's measured once it has.
    await expect(shown).toHaveCSS("opacity", "1");
    const [link, box] = await Promise.all([cite(page, n).boundingBox(), shown.boundingBox()]);
    if (!link || !box) throw new Error("Expected the citation and its card on screen");
    return { link, box };
  };

  test.describe("a citation's card", () => {
    test("uses measured placement with anchor-name but no position-area", async ({ page }) => {
      const html = await render(markdown);
      // Model both the CSS parser and CSS.supports of a partial implementation.
      await page.setContent(
        '<!doctype html><script>const supports = CSS.supports.bind(CSS); CSS.supports = (...args) => args[0].includes("position-area") ? false : supports(...args);</script>' +
          '<div style="position:absolute;top:300px;left:200px">' +
          html.replace(/@supports \(anchor-name:[^{]+/g, "@supports (unsupported: value)") +
          "</div>",
      );
      expect(await page.evaluate(() => CSS.supports("anchor-name: --a"))).toBe(true);
      const { link, box } = await card(page, 1);
      near(box.y + box.height, link.y - 4);
      expect(await page.locator(".cso-card").evaluate((e) => e.style.top)).not.toBe("");
    });

    test("keeps its position throughout the exit transition", async ({ page }) => {
      await at(page, "top:300px;left:200px");
      const { box } = await card(page, 1);
      // Slow the exit so a visible frame can be sampled reliably.
      await page.locator(".cso-card").evaluate((e) => {
        e.style.transitionDuration = "1s";
      });
      await page.mouse.move(750, 550);
      await expect(cite(page, 1)).not.toHaveAttribute("data-cso-open", "");
      await expect(cite(page, 1)).toHaveAttribute("data-cso-anchor", "");
      // Firefox hides popovers immediately because it doesn't support overlay transitions.
      if (await page.evaluate(() => CSS.supports("overlay: auto"))) {
        const closing = await page.locator(".cso-card").evaluate((e) => {
          const rect = e.getBoundingClientRect();
          return { x: rect.x, y: rect.y, opacity: Number(getComputedStyle(e).opacity) };
        });
        expect(closing.opacity).toBeGreaterThan(0);
        expect(Math.abs(closing.x - box.x)).toBeLessThan(12);
        expect(Math.abs(closing.y - box.y)).toBeLessThan(12);
      }
      await cite(page, 2).hover();
      await expect(cite(page, 2)).toHaveAttribute("data-cso-open", "");
      await expect(cite(page, 2)).toHaveAttribute("data-cso-anchor", "");
      await expect(cite(page, 1)).not.toHaveAttribute("data-cso-anchor", "");
    });

    test("sits above its citation, centered, placed by the browser", async ({ page }) => {
      await at(page, "top:300px;left:200px");
      const { link, box } = await card(page, 1);
      near(box.y + box.height, link.y - 4);
      near(box.x + box.width / 2, link.x + link.width / 2);
      // Anchor positioning leaves the script no coordinates to write.
      const placed = await page
        .locator(".cso-card")
        .evaluate((element) => [CSS.supports("anchor-name: --a"), element.style.top]);
      expect(placed).toEqual([true, ""]);
    });

    test("flips below a citation at the top edge", async ({ page }) => {
      await at(page, "top:4px;left:200px");
      const { link, box } = await card(page, 1);
      near(box.y, link.y + link.height + 4);
    });

    test("stays above a citation at the bottom edge", async ({ page }) => {
      await at(page, "top:570px;left:200px");
      const { link, box } = await card(page, 1);
      near(box.y + box.height, link.y - 4);
    });

    test("stays 8px inside the viewport beside a citation at the left edge", async ({ page }) => {
      await at(page, "top:300px;left:-60px");
      near((await card(page, 1)).box.x, 8);
    });

    test("stays 8px inside the viewport beside a citation at the right edge", async ({ page }) => {
      await at(page, "top:300px;right:0;text-align:end");
      const { box } = await card(page, 2);
      near(box.x + box.width, 800 - 8);
    });

    test("grows from its citation", async ({ page }) => {
      await at(page, "top:4px;left:200px");
      const { link, box } = await card(page, 1);
      const [x, y] = (await page.locator(".cso-card").evaluate((e) => e.style.transformOrigin))
        .split(" ")
        .map(parseFloat);
      near(box.x + x!, link.x + link.width / 2);
      expect(y).toBe(0);
    });

    test("follows its citation as the page scrolls", async ({ page }) => {
      await at(page, "top:300px;left:200px;padding-bottom:2000px");
      // From the keyboard, since a scroll under a resting pointer moves it off the citation.
      await page.keyboard.press("Tab");
      await expect(page.locator(".cso-card")).toBeVisible();
      await page.evaluate(() => scrollBy(0, 100));
      await expect
        .poll(async () => {
          const [link, box] = await Promise.all([
            cite(page, 1).boundingBox(),
            page.locator(".cso-card").boundingBox(),
          ]);
          return link && box && Math.abs(link.y - 4 - (box.y + box.height)) <= 1;
        })
        .toBe(true);
    });
  });

  // The panel as the editor's node view draws it: a popover anchored to the button that opens it. Placing it is the
  // styles' job, so the page needs neither Vue nor Tiptap.
  const panel = async (page: Page, style: string, fields = 2) => {
    await page.setContent(
      `<!doctype html><html><head><style>${componentViewCss}</style></head><body style="margin:0">` +
        `<div class="cev-block" style="position:absolute;width:200px;${style}"><div class="cev-bar">` +
        '<button type="button" class="cev-props" style="anchor-name:--cev-1" popovertarget="cev-1">title=One</button>' +
        '<div id="cev-1" class="cev-panel" popover="auto" style="position-anchor:--cev-1"><p class="cev-panel-title">Card</p>' +
        '<div class="cev-field"><label>Prop</label><input></div>'.repeat(fields) +
        "</div>" +
        "</div></div></body></html>",
    );
    await page.locator(".cev-props").click();
    const [anchor, box] = await Promise.all([
      page.locator(".cev-props").boundingBox(),
      page.locator(".cev-panel").boundingBox(),
    ]);
    if (!anchor || !box) throw new Error("Expected the button and its panel on screen");
    return { anchor, box };
  };

  test.describe("the editor's props panel", () => {
    test("opens under its button, from its start", async ({ page }) => {
      const { anchor, box } = await panel(page, "top:100px;left:100px");
      near(box.y, anchor.y + anchor.height + 4);
      near(box.x, anchor.x);
    });

    test("flips above its button at the bottom edge", async ({ page }) => {
      const { anchor, box } = await panel(page, "bottom:8px;left:100px");
      near(box.y + box.height, anchor.y - 4);
    });

    test("keeps clear of its button when neither side has room for all of it", async ({ page }) => {
      await page.setViewportSize({ width: 800, height: 500 });
      const { anchor, box } = await panel(page, "top:240px;left:100px", 12);
      const clear = box.y + box.height <= anchor.y - 3 || box.y >= anchor.y + anchor.height + 3;
      expect(clear).toBe(true);
      expect(box.y).toBeGreaterThanOrEqual(8 - 1);
      expect(box.y + box.height).toBeLessThanOrEqual(500 - 8 + 1);
    });

    test("ends at its button's end beside the right edge", async ({ page }) => {
      const { anchor, box } = await panel(page, "top:100px;right:8px");
      near(box.x + box.width, anchor.x + anchor.width);
    });
  });
}
