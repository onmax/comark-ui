import { readFile } from "node:fs/promises";
import { createHtmlRenderer } from "@comark/html";
import { expect, type Locator, test } from "@playwright/test";
import code, { components as codeComponents } from "../packages/code/src/html.ts";
import { callouts, components as githubComponents } from "../packages/github/src/html.ts";
import { themeCss, themePresets } from "../docs/play-theme.ts";
import { fixture } from "./helpers.ts";

const previewCss = await readFile(new URL("../docs/play-preview.css", import.meta.url), "utf8");
const galleryCss = await readFile(
  new URL("../docs/app/assets/gallery.css", import.meta.url),
  "utf8",
);
const render = createHtmlRenderer({
  plugins: [code(), callouts()],
  components: { ...codeComponents, ...githubComponents },
});

async function contrast(element: Locator) {
  return element.evaluate((node) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d")!;
    const luminance = () => {
      const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data;
      return [r, g, b].reduce((sum, byte, index) => {
        const channel = byte / 255;
        return (
          sum +
          (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4) *
            [0.2126, 0.7152, 0.0722][index]!
        );
      }, 0);
    };
    const ancestors: Element[] = [];
    for (let parent: Element | null = node; parent; parent = parent.parentElement)
      ancestors.unshift(parent);
    context.fillStyle = "white";
    context.fillRect(0, 0, 1, 1);
    for (const ancestor of ancestors) {
      context.fillStyle = getComputedStyle(ancestor).backgroundColor;
      context.fillRect(0, 0, 1, 1);
    }
    // The fold summary paints a 5% foreground tint with border-image.
    if (node.matches(".ck-fold>summary")) {
      context.fillStyle = `color-mix(in srgb,${getComputedStyle(node).getPropertyValue("--_comark-foreground")} 5%,transparent)`;
      context.fillRect(0, 0, 1, 1);
    }
    const background = luminance();
    context.fillStyle = getComputedStyle(node).color;
    context.fillRect(0, 0, 1, 1);
    const foreground = luminance();
    return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
  });
}

for (const mode of ["system", "class"]) {
  test(`dark faint text passes AA with ${mode} color mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: mode === "system" ? "dark" : "light" });
    await fixture(page, "<footer>Built with Comark UI</footer>", previewCss);
    if (mode === "class") await page.evaluate(() => (document.documentElement.className = "dark"));
    expect(await contrast(page.locator("footer"))).toBeGreaterThanOrEqual(4.5);
    await page.setContent(
      `<style>${galleryCss}</style><div class="tool"><div class="gallery dark"><div class="gallery-canvas"><div class="gallery-group"><h2>Annotate <small>3 examples</small></h2></div></div></div></div>`,
    );
    expect(await contrast(page.locator("small"))).toBeGreaterThanOrEqual(4.5);
  });
}

for (const target of ["summary", ".cgc-icon"]) {
  test(`${target === "summary" ? "collapsed labels" : "warning icons"} pass AA in each host theme`, async ({
    page,
  }) => {
    for (const preset of themePresets) {
      for (const mode of ["light", "dark"] as const) {
        await page.emulateMedia({ colorScheme: mode });
        await fixture(
          page,
          await render(
            "```ts collapse={2-3}\nconst first = 1;\nconst second = 2;\nconst third = 3;\n```\n\n> [!WARNING]\n> Check this setting.",
          ),
          `${previewCss}\n${themeCss({ preset: preset.id, tokens: preset.tokens, css: preset.css })}`,
        );
        await page.evaluate((scheme) => (document.documentElement.className = scheme), mode);
        await expect(page.locator("summary")).toHaveText(/collapsed lines/);
        expect(
          await contrast(page.locator(target)),
          `${preset.label} ${mode}`,
        ).toBeGreaterThanOrEqual(target === "summary" ? 4.5 : 3);
      }
    }
  });
}

for (const [file, selector, body] of [
  [
    "landing.css",
    ".landing-footer",
    '<div data-path="/"><footer class="landing-footer">Built with Comark UI</footer></div>',
  ],
  [
    "tools.css",
    ".tool-index-title",
    '<div class="tool"><span class="tool-index-title" style="color:var(--faint)">Components</span></div>',
  ],
]) {
  test(`${file} faint text passes AA in the dark docs shell`, async ({ page }) => {
    const css = await readFile(new URL(`../docs/app/assets/${file}`, import.meta.url), "utf8");
    await fixture(
      page,
      body!,
      `${css}\n:root{--ui-bg:#18181b;--ui-text-dimmed:#71717a;--ui-text-muted:#a1a1aa}body{background:var(--ui-bg)}`,
    );
    expect(await contrast(page.locator(selector!))).toBeGreaterThanOrEqual(4.5);
  });
}
