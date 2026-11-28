import { createHtmlRenderer } from "@comark/html";
import type { Page } from "@playwright/test";
import carousel, { components } from "../packages/carousel/src/html.ts";
import zoom, { components as zoomComponents } from "../packages/zoom/src/html.ts";

export const render = createHtmlRenderer({
  plugins: [carousel(), zoom()],
  components: { ...components, ...zoomComponents },
});

export const open = async (
  page: Page,
  markdown: string,
  options: { dir?: string; script?: boolean; width?: string; style?: string } = {},
) => {
  let html = await render(markdown);
  if (options.script === false) html = html.replace(/<script>[\s\S]*?<\/script>/g, "");
  await page.setContent(
    `<!doctype html><html dir="${options.dir ?? "ltr"}"><style>body{width:${options.width ?? "48rem"};margin:2rem}pre{overflow-x:auto}${options.style ?? ""}</style><body>${html}</body></html>`,
  );
};

export const five = '::carousel{title="Tour" columns=3}\nOne\n\nTwo\n\nThree\n\nFour\n\nFive\n::';

export const parts = (page: Page, title = "Tour") => {
  const root = page.locator(`.cc[aria-label="${title}"]`);
  const controls = root.locator(":scope>.cc-controls");
  return {
    root,
    track: root.locator(":scope>.cc-run>.cc-track"),
    count: controls.locator(".cc-count"),
    prev: controls.getByRole("button", { name: "Previous slide" }),
    next: controls.getByRole("button", { name: "Next slide" }),
  };
};
