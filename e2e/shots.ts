// Screenshots the component gallery, one PNG per package, for a pull request's before and after. It serves the built
// docs/dist on a free port of its own, since another agent's server may hold the usual one, or reads another site
// with --site, such as the live one for the before. An --edit takes the `edit` parameter of a gallery link, so a
// screenshot can show copies and changed props.
//
//   node e2e/shots.ts [--site <url>] [--out <dir>] [--scheme light|dark|both] [--edit <code>] [package …]
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createServer } from "node:net";
import { parseArgs } from "node:util";
import { chromium } from "@playwright/test";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    site: { type: "string" },
    out: { type: "string", default: "test-results/gallery" },
    scheme: { type: "string", default: "both" },
    edit: { type: "string" },
  },
});
if (!["light", "dark", "both"].includes(values.scheme))
  throw new Error(`--scheme takes light, dark, or both, not "${values.scheme}".`);

const freePort = () =>
  new Promise<number>((resolve, reject) => {
    const server = createServer().listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() =>
        typeof address === "object" && address ? resolve(address.port) : reject(),
      );
    });
  });

let site = values.site;
let server: ReturnType<typeof spawn> | undefined;
if (!site) {
  if (!existsSync(new URL("../docs/dist/play/gallery/index.html", import.meta.url)))
    throw new Error("No gallery in docs/dist. Run `pnpm build && node docs/build.ts` first.");
  const port = await freePort();
  const child = spawn(process.execPath, [new URL("serve.ts", import.meta.url).pathname], {
    env: { ...process.env, E2E_PORT: String(port) },
    stdio: ["ignore", "pipe", "inherit"],
  });
  server = child;
  await new Promise((resolve) => child.stdout?.once("data", resolve));
  site = `http://127.0.0.1:${port}`;
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const url = new URL("/play/gallery/", site);
  url.searchParams.set("scheme", values.scheme);
  if (values.edit) url.searchParams.set("edit", values.edit);
  await page.goto(url.href);
  // The canvas lays out flat for a screenshot: at full size, without its dots, bar, or the index, and a row wraps into
  // the window's width, as a pull request shows it.
  await page.addStyleTag({
    content: `.sidebar, .gallery-bar, .gallery-stage .hero { display: none !important }
      .gallery, .gallery-canvas { height: auto !important; overflow: visible !important; background-image: none !important }
      .gallery-sizer { width: auto !important; height: auto !important }
      .gallery-stage { width: auto !important; padding: 0 !important; transform: none !important }
      .gallery-group { margin: 0 !important; padding: 1.5rem }
      .gallery-cells { flex-wrap: wrap }`,
  });
  const groups = await page
    .locator(".gallery-group")
    .evaluateAll((nodes) => nodes.map((node) => (node as HTMLElement).dataset.group ?? ""));
  const unknown = positionals.filter((name) => !groups.includes(name));
  if (unknown.length)
    throw new Error(`No ${unknown.join(", ")} in the gallery. Its packages: ${groups.join(", ")}.`);
  await mkdir(values.out, { recursive: true });
  // Settled: nothing waits to render, and every frame shown has its height, images, and fonts.
  const settled = (group: string) =>
    page.waitForFunction(
      (group) => {
        const gallery = document.querySelector<HTMLElement>(".gallery");
        const frames = [
          ...document.querySelectorAll<HTMLIFrameElement>(
            `.gallery-group[data-group="${group}"] .gallery-frame`,
          ),
        ].filter((frame) => frame.checkVisibility());
        return (
          gallery?.dataset.busy === undefined &&
          frames.every(
            (frame) =>
              frame.dataset.ready !== undefined &&
              [...(frame.contentDocument?.images ?? [])].every((image) => image.complete) &&
              frame.contentDocument?.fonts.status === "loaded",
          )
        );
      },
      group,
      { timeout: 60_000 },
    );
  for (const group of positionals.length ? positionals : groups) {
    await page.setViewportSize({ width: 1440, height: 900 });
    const section = page.locator(`.gallery-group[data-group="${group}"]`);
    // The other sections hide, so frames loading above this one can't move it while it's taken, and a lazy frame
    // loads only near the screen, while a screenshot takes the whole section at once.
    await page.evaluate((group) => {
      for (const node of document.querySelectorAll<HTMLElement>(".gallery-group"))
        node.hidden = node.dataset.group !== group;
      for (const frame of document.querySelectorAll(`.gallery-group[data-group="${group}"] iframe`))
        (frame as HTMLIFrameElement).loading = "eager";
    }, group);
    await settled(group);
    // Chromium doesn't paint a frame outside the window, which a section taken in pieces has, so the window takes the
    // whole page.
    await page.setViewportSize({
      width: 1440,
      height: await page.evaluate(() => document.documentElement.scrollHeight),
    });
    await settled(group);
    // Frames take their height from a ResizeObserver, then fade in.
    await page.waitForTimeout(400);
    const path = `${values.out}/${group}.png`;
    await section.screenshot({ path, animations: "disabled" });
    console.log(path);
  }
} finally {
  await browser.close();
  server?.kill();
}
