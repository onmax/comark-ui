import { createHash } from "node:crypto";
import { createHtmlRenderer } from "@comark/html";
import { expect, type Page, test } from "@playwright/test";
import comarkUi, { mermaidScript } from "../packages/ui/src/html.ts";

const render = createHtmlRenderer(
  comarkUi({
    chips: { download: false },
    badge: { download: false },
    icon: { fetch: false },
    diagrams: { draw: false },
  }),
);

const flowchart = "flowchart LR\n  Draft --> Review --> Merge";
// A label with a run of three backticks, so the copied fence needs four.
const ticks = 'flowchart LR\n  A["`one ``` two`"] --> B';
const markdown = `\`\`\`mermaid\n${flowchart}\n\`\`\`\n\n\`\`\`\`mermaid\n${ticks}\n\`\`\`\``;
const background = "rgb(250, 240, 230)";
const hash = (script: string) => `'sha256-${createHash("sha256").update(script).digest("base64")}'`;

// On the docs site's origin, a secure context, so the clipboard is there to grant. The page allows only the scripts the
// renderer writes, by hash, as a host with a strict Content Security Policy would.
async function open(page: Page) {
  const html = await render(markdown);
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]!);
  expect(scripts).toContain(mermaidScript);
  await page.route("**/fixture/", (route) =>
    route.fulfill({
      contentType: "text/html",
      headers: {
        "content-security-policy": `default-src 'none'; img-src data: blob:; connect-src blob:; style-src 'unsafe-inline'; script-src ${scripts.map(hash).join(" ")}`,
      },
      body: `<!doctype html><meta charset="utf-8"><main style="width:40rem;margin:2rem auto;--comark-background:${background}">${html}</main>`,
    }),
  );
  await page.addInitScript(() => {
    const blocked: string[] = [];
    Object.assign(window, { blocked });
    document.addEventListener("securitypolicyviolation", (event) =>
      blocked.push(event.violatedDirective),
    );
  });
  await page.goto("/fixture/");
  await expect(page.locator("html")).toHaveAttribute("data-mermaid-ready", "");
}

test("a Mermaid diagram copies as an opaque PNG and as its source under a strict CSP, and zooms", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  const [first, second] = [page.locator(".cmm").first(), page.locator(".cmm").nth(1)];
  const dialog = page.locator(".cz-dialog");

  await first.hover();
  await first.getByRole("button", { name: "Copy image" }).click();
  await expect(first.locator(".cmm-status")).toHaveText("Image copied");
  const natural = await first
    .locator("svg.pele")
    .evaluate((svg) => [Number(svg.getAttribute("width")), Number(svg.getAttribute("height"))]);
  const png = await page.evaluate(async () => {
    const [item] = await navigator.clipboard.read();
    const blob = await item!.getType("image/png");
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d")!;
    context.drawImage(bitmap, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const corner = Array.from(pixels.slice(0, 3));
    let drawn = 0;
    let opaque = true;
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index + 3] !== 255) opaque = false;
      if ([0, 1, 2].some((channel) => Math.abs(pixels[index + channel]! - corner[channel]!) > 40))
        drawn++;
    }
    return { type: blob.type, width: bitmap.width, height: bitmap.height, corner, drawn, opaque };
  });
  expect(png.type).toBe("image/png");
  // Twice the diagram's own size, on the page's background, with the diagram drawn on it.
  expect([png.width, png.height]).toEqual(natural.map((side) => Math.round(side * 2)));
  expect(png.opaque).toBe(true);
  expect(`rgb(${png.corner.join(", ")})`).toBe(background);
  expect(png.drawn).toBeGreaterThan(500);

  await second.hover();
  await second.getByRole("button", { name: "Copy source" }).click();
  await expect(second.locator(".cmm-status")).toHaveText("Source copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    `\`\`\`\`mermaid\n${ticks}\n\`\`\`\``,
  );
  // A click on a button never opens the zoom.
  await expect(dialog).toHaveCount(0);

  await first.locator(".pele-diagram").click();
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".pele-diagram svg.pele")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(first.locator(".pele-diagram")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await page.keyboard.press(" ");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");

  expect(await page.evaluate(() => (window as unknown as { blocked: string[] }).blocked)).toEqual(
    [],
  );
});

test("without the clipboard, Copy image offers the PNG and Copy source selects the Markdown", async ({
  page,
}) => {
  await open(page);
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { value: undefined }));
  const diagram = page.locator(".cmm").first();

  await diagram.hover();
  await diagram.getByRole("button", { name: "Copy image" }).click();
  await expect(diagram.locator(".cmm-status")).toHaveText(
    "Couldn't copy the image. Open the PNG to save it.",
  );
  const link = diagram.getByRole("link", { name: "Open PNG" });
  await expect(link).toBeVisible();
  const size = await link.evaluate(
    async (node: HTMLAnchorElement) => (await (await fetch(node.href)).blob()).size,
  );
  expect(size).toBeGreaterThan(0);

  await diagram.getByRole("button", { name: "Copy source" }).click();
  await expect(diagram.locator(".cmm-status")).toHaveText(
    "Couldn't copy, so the source is selected. Press Ctrl+C or ⌘C.",
  );
  await expect(diagram.locator(".cmm-markdown")).toBeVisible();
  expect(await page.evaluate(() => getSelection()?.toString())).toBe(
    `\`\`\`mermaid\n${flowchart}\n\`\`\``,
  );
});
