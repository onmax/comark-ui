import { fileURLToPath } from "node:url";
import { createHtmlRenderer } from "@comark/html";
import { expect, type Page, test } from "@playwright/test";
import { build } from "vite";
import zoom, { components } from "../packages/zoom/src/html.ts";
import { fixture } from "./helpers.ts";

// The real Vue component in a browser bundle, so the page runs it the way an app does.
let bundle: string;
test.beforeAll(async () => {
  const result = await build({
    configFile: false,
    logLevel: "error",
    define: { "process.env.NODE_ENV": '"production"' },
    build: {
      write: false,
      minify: false,
      lib: {
        entry: fileURLToPath(
          new URL("../packages/ui/test/fixtures/comark-html.ts", import.meta.url),
        ),
        formats: ["iife"],
        name: "ComarkHtmlTest",
      },
    },
  });
  // SAFETY: a lib build without `write` returns one output with the bundle's chunk.
  const output = (Array.isArray(result) ? result[0]! : result) as {
    output: { type: string; code?: string }[];
  };
  bundle = output.output.find((chunk) => chunk.type === "chunk")!.code!;
});

type Test = {
  ComarkHtmlTest: {
    mount: (target: HTMLElement, html: string, tag?: string) => (next: string) => void;
  };
  update: (next: string) => void;
  runs?: number;
};

async function mount(page: Page, html: string, tag?: string) {
  await page.route("**/comark-html-test.js", (route) =>
    route.fulfill({ contentType: "text/javascript", body: bundle }),
  );
  await page.addScriptTag({ url: "/comark-html-test.js" });
  await page.evaluate(
    ({ html, tag }) => {
      const app = window as unknown as Test;
      app.update = app.ComarkHtmlTest.mount(document.querySelector("main")!, html, tag);
    },
    { html, tag },
  );
}

const count = "<p>Counted</p><script>window.runs = (window.runs ?? 0) + 1</script>";

test("ComarkHtml runs the scripts in its HTML once, and again when the HTML changes", async ({
  page,
}) => {
  await fixture(page, "");
  await mount(page, count);
  await expect(page.locator("main > div > p")).toHaveText("Counted");
  expect(await page.evaluate(() => (window as unknown as Test).runs)).toBe(1);

  await page.evaluate(
    (next) => (window as unknown as Test).update(next),
    count.replace("Counted", "Replaced"),
  );
  await expect(page.locator("main > div > p")).toHaveText("Replaced");
  expect(await page.evaluate(() => (window as unknown as Test).runs)).toBe(2);
});

test("ComarkHtml renders the tag it's given", async ({ page }) => {
  await fixture(page, "");
  await mount(page, "<b>Inline</b>", "span");
  await expect(page.locator("main > span > b")).toHaveText("Inline");
});

test("a zoomable image rendered to HTML zooms inside ComarkHtml", async ({ page }) => {
  const render = createHtmlRenderer({ plugins: [zoom()], components });
  await fixture(page, "");
  await mount(page, await render("![Office correlations dashboard](/dashboard.png)"));
  await page.locator("main img[data-zoom]").click();
  await expect(page.locator(".cz-dialog")).toBeVisible();
});

test("ComarkHtml preserves script nonces under an HTTP CSP on mount and update", async ({
  page,
}) => {
  const nonce = "comark-html-test-nonce";
  await page.route("**/fixture/", (route) =>
    route.fulfill({
      contentType: "text/html",
      headers: { "Content-Security-Policy": `script-src 'self' 'nonce-${nonce}'` },
      body: "<!doctype html><main></main>",
    }),
  );
  await page.goto("/fixture/");
  const render = createHtmlRenderer({ plugins: [zoom()], components });
  const rendered = await render("![Office correlations dashboard](/dashboard.png)");
  const html = (count + rendered).replaceAll("<script>", `<script nonce="${nonce}">`);
  await mount(page, html);
  await expect.poll(() => page.evaluate(() => (window as unknown as Test).runs)).toBe(1);
  const script = page.locator("main script").first();
  expect(await script.getAttribute("nonce")).toBe("");
  expect(await script.evaluate((element: HTMLScriptElement) => element.nonce)).toBe(nonce);

  await page.evaluate(
    (next) => (window as unknown as Test).update(next),
    html.replace("Counted", "Replaced"),
  );
  await expect.poll(() => page.evaluate(() => (window as unknown as Test).runs)).toBe(2);
  await page.locator("main img[data-zoom]").click();
  await expect(page.locator(".cz-dialog")).toBeVisible();
});
