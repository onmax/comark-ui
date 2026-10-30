import { createHtmlRenderer } from "@comark/html";
import { readFile } from "node:fs/promises";
import { expect, type Page, type Route, test } from "@playwright/test";
import media, { components } from "../packages/media/src/html.ts";
import { typesetCss } from "../packages/ui/src/typeset-css.ts";

const render = createHtmlRenderer({ plugins: [media()], components });
// Four seconds of silence as a WAV, so the player has a length without a server.
const silence = (() => {
  const rate = 8000;
  const bytes = rate * 4;
  const wav = Buffer.alloc(44 + bytes, 128);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + bytes, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate, 28);
  wav.writeUInt16LE(1, 32);
  wav.writeUInt16LE(8, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(bytes, 40);
  return wav;
})();
const clip = await readFile(new URL("clip.webm", import.meta.url));
// The page loads its files from routes, since a Markdown image's src must end in a media extension. Chromium only
// seeks in a file whose server answers byte ranges, as real hosts do.
const serve = (body: Buffer, type: string) => (route: Route) => {
  const [, from = "0", to] = /bytes=(\d+)-(\d*)/.exec(route.request().headers().range ?? "") ?? [];
  const start = Number(from);
  const end = to ? Number(to) : body.length - 1;
  return route.fulfill({
    status: 206,
    body: body.subarray(start, end + 1),
    headers: {
      "accept-ranges": "bytes",
      "content-range": `bytes ${start}-${end}/${body.length}`,
      "content-type": type,
    },
  });
};
const open = async (
  page: Page,
  markdown: string,
  options: { script?: boolean; typeset?: boolean; width?: string } = {},
) => {
  await page.route("**/silence.wav*", serve(silence, "audio/wav"));
  await page.route("**/clip.webm", serve(clip, "video/webm"));
  await page.route("**/missing.wav", (route) => route.fulfill({ status: 404 }));
  let html = await render(markdown);
  if (options.script === false) html = html.replace(/<script>[\s\S]*?<\/script>/g, "");
  if (options.typeset) html = `<main><style>${typesetCss}</style>${html}</main>`;
  await page.route("http://media.test/", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html><body style="width:${options.width ?? "32rem"};margin:2rem">${html}</body></html>`,
    }),
  );
  await page.goto("http://media.test/", { waitUntil: "domcontentloaded" });
};

test("an audio player plays, pauses, and seeks with its own controls", async ({ page }) => {
  await open(page, "![Silence](silence.wav)");
  const player = page.getByRole("group", { name: "Silence" });
  const times = player.locator(".cm-time");
  await expect(player.locator("audio")).toBeHidden();
  await expect(times.last()).toHaveText("0:04");

  await player.getByRole("button", { name: "Play" }).click();
  await expect(player.getByRole("button", { name: "Pause" })).toBeVisible();
  await expect(times.first()).not.toHaveText("0:00");
  await player.getByRole("button", { name: "Pause" }).click();
  await expect(player).not.toHaveAttribute("data-playing");

  const seek = player.getByRole("slider", { name: "Seek" });
  await seek.focus();
  await page.keyboard.press("Home");
  await expect(times.first()).toHaveText("0:00");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(seek).toHaveAttribute("aria-valuetext", "0:01 of 0:04");

  await player.getByRole("button", { name: "Mute" }).click();
  await expect(player.getByRole("button", { name: "Unmute" })).toBeVisible();
});

test("the volume opens over the mute button for the pointer and the keyboard, and zero mutes", async ({
  page,
}) => {
  await open(page, "![A gray clip](clip.webm)");
  const player = page.getByRole("group", { name: "A gray clip" });
  const mute = player.locator(".cm-mute");
  const volume = player.getByRole("slider", { name: "Volume" });
  const panel = player.locator(".cm-level");
  await expect(player.locator(".cm-time").last()).toHaveText("0:04");
  await expect(panel).toHaveCSS("opacity", "0");
  await expect(panel).toHaveCSS("pointer-events", "none");

  await mute.hover();
  await expect(panel).toHaveCSS("opacity", "1");
  // The pointer crosses the gap up to the panel without closing it.
  const box = (await volume.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height + 14, { steps: 4 });
  await page.mouse.move(box.x + box.width / 2, box.y + box.height - 2, { steps: 4 });
  await page.mouse.down();
  await page.mouse.up();
  await expect(player).toHaveAttribute("data-muted");
  await expect(mute).toHaveAttribute("aria-label", "Unmute");
  await page.mouse.move(0, 0);
  await expect(panel).toHaveCSS("opacity", "0");
  await expect(panel).toHaveCSS("pointer-events", "none");

  // All the way down, Unmute plays at full volume.
  await mute.click();
  await expect(player).not.toHaveAttribute("data-muted");
  expect(await player.locator("video").evaluate((video: HTMLVideoElement) => video.volume)).toBe(1);
  await page.mouse.move(0, 0);

  await player.getByRole("slider", { name: "Seek" }).focus();
  await page.keyboard.press("Tab");
  await expect(panel).toHaveCSS("opacity", "1");
  await page.keyboard.press("Tab");
  await expect(volume).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(volume).toHaveAttribute("aria-valuetext", "95%");
  expect(
    await player.locator("video").evaluate((video: HTMLVideoElement) => video.volume),
  ).toBeCloseTo(0.95);
  await page.keyboard.press("Home");
  await expect(mute).toHaveAttribute("aria-label", "Unmute");
  await page.keyboard.press("Tab");
  await expect(panel).toHaveCSS("opacity", "0");
});

test("the volume follows DOM order when tabbing backward through video and audio controls", async ({
  page,
}) => {
  for (const source of ["clip.webm", "silence.wav"]) {
    await open(page, `![Player](${source})\n\n[After the player](#after)`);
    const player = page.getByRole("group", { name: "Player" });
    await expect(player.locator(".cm-time").last()).toHaveText("0:04");
    const next =
      source === "clip.webm"
        ? player.getByRole("button", { name: "Full screen" })
        : page.getByRole("link", { name: "After the player" });
    await next.focus();
    await page.keyboard.press("Shift+Tab");
    const volume = player.getByRole("slider", { name: "Volume" });
    await expect(volume).toBeFocused();
    await expect(player.locator(".cm-level")).toHaveCSS("opacity", "1");
    await page.keyboard.press("ArrowDown");
    await expect(volume).toHaveAttribute("aria-valuetext", "95%");
    await page.keyboard.press("Shift+Tab");
    await expect(player.locator(".cm-mute")).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(player.getByRole("slider", { name: "Seek" })).toBeFocused();
    await expect(player.locator(".cm-level")).toHaveCSS("opacity", "0");
  }
});

test("the full volume range is reachable above a short video", async ({ page }) => {
  await open(page, "![A gray clip](clip.webm)", { width: "240px" });
  const player = page.getByRole("group", { name: "A gray clip" });
  await expect(player.locator(".cm-time").last()).toHaveText("0:04");
  const mute = player.locator(".cm-mute");
  await mute.click();
  await expect(player).toHaveAttribute("data-muted");
  const panel = player.locator(".cm-level");
  await expect(panel).toHaveCSS("opacity", "1");
  const volume = player.getByRole("slider", { name: "Volume" });
  const box = (await volume.boundingBox())!;
  const frame = (await player.boundingBox())!;
  expect(box.y).toBeLessThan(frame.y);
  await volume.click({ position: { x: box.width / 2, y: 1 }, timeout: 3000 });
  await expect(player).not.toHaveAttribute("data-muted");
  expect(await player.locator("video").evaluate((video: HTMLVideoElement) => video.volume)).toBe(1);
});

test("a video plays with its own controls, from its bar or a click, and goes full screen", async ({
  page,
}) => {
  await open(page, "![A gray clip](clip.webm)");
  const player = page.getByRole("group", { name: "A gray clip" });
  const video = player.locator("video");
  await expect(player.locator(".cm-time").last()).toHaveText("0:04");
  expect(await video.evaluate((element: HTMLVideoElement) => element.controls)).toBe(false);

  await player.getByRole("button", { name: "Play" }).click();
  await expect(player).toHaveAttribute("data-playing");
  await video.click();
  await expect(player).not.toHaveAttribute("data-playing");

  await player.getByRole("button", { name: "Full screen" }).click();
  await expect(player).toHaveAttribute("data-fullscreen");
  await player.getByRole("button", { name: "Exit full screen" }).click();
  await expect(player).not.toHaveAttribute("data-fullscreen");
});

test("a video fills its frame under the typeset, with no margin above it", async ({ page }) => {
  await open(page, "Intro.\n\n![A gray clip](clip.webm)", { typeset: true });
  const player = page.getByRole("group", { name: "A gray clip" });
  await expect(player.locator(".cm-time").last()).toHaveText("0:04");
  const frame = (await player.boundingBox())!;
  const video = (await player.locator("video").boundingBox())!;
  expect(video.y - frame.y).toBeLessThanOrEqual(1);
  expect(frame.y + frame.height - (video.y + video.height)).toBeLessThanOrEqual(1);
});

test("a narrow player gives its seek bar a row of its own, above the buttons", async ({ page }) => {
  for (const [width, own] of [
    ["18rem", true],
    ["32rem", false],
  ] as const) {
    await open(page, "![Silence](silence.wav)", { width });
    const player = page.getByRole("group", { name: "Silence" });
    await expect(player.locator(".cm-time").last()).toHaveText("0:04");
    const bar = (await player.locator(".cm-bar").boundingBox())!;
    const seek = (await player.getByRole("slider", { name: "Seek" }).boundingBox())!;
    const play = (await player.getByRole("button", { name: "Play" }).boundingBox())!;
    expect(seek.y + seek.height <= play.y).toBe(own);
    expect(seek.width > bar.width * 0.9).toBe(own);
  }
});

test.describe("touch video controls", () => {
  test.use({ hasTouch: true });

  test("hour-long times keep the buttons on one row at narrow widths", async ({ page }) => {
    await open(page, "![A gray clip](clip.webm)");
    const player = page.getByRole("group", { name: "A gray clip" });
    await expect(player.locator(".cm-time").last()).toHaveText("0:04");
    expect(await page.evaluate(() => matchMedia("(pointer:coarse)").matches)).toBe(true);
    // A touch screen sets the volume with its own buttons.
    await player.locator(".cm-mute").focus();
    await expect(player.getByRole("slider", { name: "Volume", includeHidden: true })).toBeHidden();
    // A supported wider font makes the limiting geometry independent of CI's system font.
    await page.locator("body").evaluate((body) => {
      body.style.setProperty("--comark-font", "monospace");
    });
    // Exercise hour-form geometry without adding an hour-long video fixture.
    await player.locator(".cm-time").evaluateAll((times) => {
      times[0].textContent = "1:00:00";
      times[1].textContent = "1:02:03";
    });

    for (const width of [240, 288, 289, 319, 320, 321, 375]) {
      await page.locator("body").evaluate((body, width) => {
        body.style.width = `${width}px`;
      }, width);
      const bar = (await player.locator(".cm-bar").boundingBox())!;
      const seek = (await player.getByRole("slider", { name: "Seek" }).boundingBox())!;
      const buttons = await player.getByRole("button").all();
      const play = (await buttons[0].boundingBox())!;
      expect(play.width).toBe(40);
      expect(seek.y + seek.height).toBeLessThanOrEqual(play.y);
      expect(seek.width).toBeGreaterThan(bar.width * 0.9);
      for (const button of buttons) {
        const box = (await button.boundingBox())!;
        expect(box.y, `button row at ${width}px`).toBe(play.y);
        expect(box.x).toBeGreaterThanOrEqual(bar.x);
        expect(box.x + box.width).toBeLessThanOrEqual(bar.x + bar.width);
      }
      expect(await player.locator(".cm-time").first().isVisible()).toBe(width >= 320);
      expect(
        await player.locator(".cm-bar").evaluate((bar) => bar.scrollWidth <= bar.clientWidth),
      ).toBe(true);
    }
  });
});

test("a video in a frame that can't go full screen has no full screen button", async ({ page }) => {
  await open(page, "![A gray clip](clip.webm)");
  const html = await page.content();
  await page.setContent(
    `<iframe sandbox="allow-scripts" srcdoc="${html.replaceAll("&", "&amp;").replaceAll('"', "&quot;")}"></iframe>`,
  );
  const player = page.frameLocator("iframe").getByRole("group", { name: "A gray clip" });
  await expect(player).toHaveAttribute("data-media-ready");
  await expect(player.getByRole("button", { name: "Play" })).toBeVisible();
  await expect(player.getByRole("button", { name: "Full screen" })).toBeHidden();
});

test("one player with sound plays at a time, and a muted loop plays on", async ({ page }) => {
  await open(page, "![Loop](clip.webm){autoplay loop muted}\n\n![One](silence.wav)");
  await expect(page.getByRole("group", { name: "Loop" })).toHaveAttribute("data-playing");
  await page.getByRole("group", { name: "One" }).getByRole("button", { name: "Play" }).click();
  await expect(page.getByRole("group", { name: "One" })).toHaveAttribute("data-playing");
  await expect(page.getByRole("group", { name: "Loop" })).toHaveAttribute("data-playing");
});

test("one audio player plays at a time", async ({ page }) => {
  await open(page, "![One](silence.wav)\n\n![Two](silence.wav?two)");
  await page.getByRole("group", { name: "One" }).getByRole("button", { name: "Play" }).click();
  await page.getByRole("group", { name: "Two" }).getByRole("button", { name: "Play" }).click();
  await expect(page.getByRole("group", { name: "Two" })).toHaveAttribute("data-playing");
  await expect(page.getByRole("group", { name: "One" })).not.toHaveAttribute("data-playing");
});

test("the browser's player shows without the script, and when the file can't play", async ({
  page,
}) => {
  await open(page, "![Silence](silence.wav)\n\n![A gray clip](clip.webm)", { script: false });
  const player = page.getByRole("group", { name: "Silence" });
  await expect(player.locator("audio")).toBeVisible();
  await expect(player.locator(".cm-bar")).toBeHidden();
  const clip = page.getByRole("group", { name: "A gray clip" });
  await expect(clip.locator("video")).toHaveAttribute("controls");
  await expect(clip.locator(".cm-bar")).toBeHidden();

  await open(page, "![Missing](missing.wav)");
  const missing = page.getByRole("group", { name: "Missing" });
  await expect(missing).toHaveAttribute("data-error");
  await expect(missing.locator("audio")).toBeVisible();
  await expect(missing.locator(".cm-bar")).toBeHidden();
});
