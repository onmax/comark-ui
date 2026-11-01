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
const portrait = await readFile(new URL("portrait.webm", import.meta.url));
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
  await expect(player.locator("video")).toHaveJSProperty("volume", 1);
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
    await expect(player.getByRole("button", { name: "Settings" })).toBeFocused();
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
  await expect(player.locator("video")).toHaveJSProperty("volume", 1);
});

test("a video plays with its own controls, from its bar or a click, and goes full screen", async ({
  page,
}) => {
  await open(page, "![A gray clip](clip.webm)");
  const player = page.getByRole("group", { name: "A gray clip" });
  const video = player.locator("video");
  await expect(player.locator(".cm-time").last()).toHaveText("0:04");
  await expect(video).toHaveJSProperty("controls", false);

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

test("a video without its size keeps the column's 16:9 room until its file answers", async ({
  page,
}) => {
  // The file never answers, so the video never learns its size.
  await page.route("**/slow.webm", () => {});
  await open(page, "![A slow clip](slow.webm)");
  const player = page.getByRole("group", { name: "A slow clip" });
  await expect(player).toHaveAttribute("data-media-ready");
  const column = (await page.locator("body").boundingBox())!;
  const video = (await player.locator("video").boundingBox())!;
  expect(video.width).toBeGreaterThan(column.width - 4);
  expect(Math.abs(video.height - (video.width * 9) / 16)).toBeLessThanOrEqual(1);
  // The bar keeps its single row instead of stacking its controls in a column.
  expect((await player.locator(".cm-bar").boundingBox())!.height).toBeLessThan(60);
});

test("a video's poster sizes its frame before the file answers", async ({ page }) => {
  await page.route("**/slow.webm", () => {});
  await page.route("**/tall.svg", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="320"/>',
    }),
  );
  await open(page, '![A tall clip](slow.webm){poster="tall.svg"}');
  const player = page.getByRole("group", { name: "A tall clip" });
  await expect(player).toHaveAttribute("data-sized");
  const frame = (await player.boundingBox())!;
  const video = (await player.locator("video").boundingBox())!;
  expect(video.width).toBe(180);
  expect(frame.width - video.width).toBeLessThanOrEqual(2);
});

test("poster sizing follows replacement, removal, and failed loads", async ({ page }) => {
  await page.route("**/slow.webm", () => {});
  const tall = '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="320"/>';
  await page.route("**/tall.svg", (route) =>
    route.fulfill({ contentType: "image/svg+xml", body: tall }),
  );
  let release!: () => void;
  const pending = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/replacement.svg", async (route) => {
    await pending;
    await route.fulfill({ contentType: "image/svg+xml", body: tall });
  });
  await page.route("**/missing.svg", (route) => route.fulfill({ status: 404 }));
  await open(page, '![A changing poster](slow.webm){poster="tall.svg"}');
  const player = page.getByRole("group", { name: "A changing poster" });
  const video = player.locator("video");
  await expect(player).toHaveAttribute("data-sized");

  await video.evaluate((video) => video.setAttribute("poster", "replacement.svg"));
  await expect(player).not.toHaveAttribute("data-sized");
  release();
  await expect(player).toHaveAttribute("data-sized");

  await video.evaluate((video) => video.removeAttribute("poster"));
  await expect(player).not.toHaveAttribute("data-sized");
  const column = (await page.locator("body").boundingBox())!;
  expect((await video.boundingBox())!.width).toBeGreaterThan(column.width - 4);

  await video.evaluate((video) => video.setAttribute("poster", "tall.svg"));
  await expect(player).toHaveAttribute("data-sized");
  const failed = page.waitForResponse("**/missing.svg");
  await video.evaluate((video) => video.setAttribute("poster", "missing.svg"));
  await failed;
  await expect(player).not.toHaveAttribute("data-sized");
});

test("an earlier poster load cannot size its pending replacement", async ({ page }) => {
  await page.route("**/slow.webm", () => {});
  let release!: () => void;
  const pending = new Promise<void>((resolve) => (release = resolve));
  const requested = page.waitForRequest("**/earlier.svg");
  await page.route("**/earlier.svg", async (route) => {
    await pending;
    await route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="320"/>',
    });
  });
  await page.route("**/pending.svg", () => {});
  await open(page, '![A pending poster](slow.webm){poster="earlier.svg"}');
  await requested;
  const player = page.getByRole("group", { name: "A pending poster" });
  await player.locator("video").evaluate((video) => video.setAttribute("poster", "pending.svg"));
  release();
  // Decode the same resource and let its load handlers run before checking the old callback's effect.
  await page.evaluate(async () => {
    const image = new Image();
    image.src = "earlier.svg";
    await image.decode();
    await new Promise(requestAnimationFrame);
  });
  await expect(player).not.toHaveAttribute("data-sized");
});

test("the settings panel sets the speed and looping, and closes on Escape or a click outside", async ({
  page,
}) => {
  await open(page, "![A gray clip](clip.webm)\n\n![Silence](silence.wav)");
  const player = page.getByRole("group", { name: "A gray clip" });
  const audio = page.getByRole("group", { name: "Silence" });
  await expect(player.locator(".cm-time").last()).toHaveText("0:04");
  const settings = player.getByRole("button", { name: "Settings" });
  const speed = player.getByRole("radiogroup", { name: "Speed" });
  await expect(settings).toHaveAttribute("aria-expanded", "false");
  await expect(speed).toBeHidden();
  await expect(player.getByRole("radio", { name: "1×", includeHidden: true })).toBeChecked();
  await expect(player.getByRole("radio", { name: "Off", includeHidden: true })).toBeChecked();

  await settings.click();
  await expect(settings).toHaveAttribute("aria-expanded", "true");
  await expect(speed).toBeVisible();
  await player.getByRole("radio", { name: "1.5×" }).click();
  await expect(player.locator("video")).toHaveJSProperty("playbackRate", 1.5);
  await player.getByRole("radio", { name: "On" }).click();
  await expect(player.locator("video")).toHaveJSProperty("loop", true);
  // Choosing keeps the panel open, and the arrow keys move along a row.
  await player.getByRole("radio", { name: "1.5×" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(player.locator("video")).toHaveJSProperty("playbackRate", 2);
  // Each player's rows are their own groups.
  await expect(audio.getByRole("radio", { name: "1×", includeHidden: true })).toBeChecked();

  await page.keyboard.press("Escape");
  await expect(speed).toBeHidden();
  await expect(settings).toBeFocused();
  await settings.click();
  await expect(speed).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(speed).toBeHidden();
  await expect(settings).toHaveAttribute("aria-expanded", "false");
  // A speed set elsewhere shows in the panel.
  await player.locator("video").evaluate((video: HTMLVideoElement) => {
    video.playbackRate = 0.5;
  });
  await expect(player.getByRole("radio", { name: "0.5×", includeHidden: true })).toBeChecked();
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
  test.use({ hasTouch: true, reducedMotion: "reduce" });

  test("spread over the video and keep settings within its width", async ({ page }) => {
    await open(page, "![A gray clip](clip.webm)");
    const player = page.getByRole("group", { name: "A gray clip" });
    await expect(player.locator(".cm-time").last()).toHaveText("0:04");
    expect(await page.evaluate(() => matchMedia("(pointer:coarse)").matches)).toBe(true);
    // A touch screen sets the volume with its own buttons.
    await player.locator(".cm-mute").focus();
    await expect(player.getByRole("slider", { name: "Volume", includeHidden: true })).toBeHidden();
    // Hour-form times are the widest the bottom row has to fit.
    await player.locator(".cm-time").evaluateAll((times) => {
      times[0].textContent = "1:00:00";
      times[1].textContent = "1:02:03";
    });

    for (const width of [240, 320, 375]) {
      await page.locator("body").evaluate((body, width) => {
        body.style.width = `${width}px`;
      }, width);
      const frame = (await player.boundingBox())!;
      const box = async (selector: string) => (await player.locator(selector).boundingBox())!;
      const [play, mute, settings, seek, full] = await Promise.all(
        [".cm-play", ".cm-mute", ".cm-settings", ".cm-seek", ".cm-full"].map(box),
      );
      expect(play.width).toBe(56);
      if (frame.height < 176) {
        expect(play.x + play.width).toBeLessThan(mute.x);
      } else {
        expect(Math.abs(play.x + play.width / 2 - (frame.x + frame.width / 2))).toBeLessThan(1);
        expect(mute.y + mute.height, `top row at ${width}px`).toBeLessThan(play.y);
      }
      expect(mute.y).toBe(settings.y);
      expect(mute.x + mute.width).toBeLessThan(settings.x);
      expect(settings.x + settings.width).toBeLessThanOrEqual(frame.x + frame.width);
      expect(play.y + play.height).toBeLessThan(seek.y);
      expect(Math.abs(seek.y + seek.height / 2 - (full.y + full.height / 2))).toBeLessThan(1);
      expect(full.x + full.width).toBeLessThanOrEqual(frame.x + frame.width);
      expect(seek.width).toBeGreaterThan(40);
      const end = player.locator(".cm-time").last();
      if (await end.isVisible())
        expect((await end.boundingBox())!.x + (await end.boundingBox())!.width).toBeLessThanOrEqual(
          full.x,
        );

      // Open at every supported width, including the narrowest player.
      await player.getByRole("button", { name: "Settings" }).tap();
      await expect(player.getByRole("button", { name: "Settings" })).toHaveAttribute(
        "aria-expanded",
        "true",
      );
      const menu = (await player.locator(".cm-menu").boundingBox())!;
      expect(menu.y).toBeGreaterThan(settings.y + settings.height);
      expect(menu.x, `menu left at ${width}px`).toBeGreaterThanOrEqual(frame.x);
      expect(menu.x + menu.width, `menu right at ${width}px`).toBeLessThanOrEqual(
        frame.x + frame.width,
      );
      expect(
        await player
          .locator(".cm-choices")
          .evaluateAll((rows) => rows.every((row) => row.scrollWidth <= row.clientWidth)),
      ).toBe(true);
      await player.getByRole("radio", { name: "1.5×" }).tap();
      await expect(player.locator("video")).toHaveJSProperty("playbackRate", 1.5);
      await player.getByRole("button", { name: "Settings" }).tap();
    }
    await expect(player.locator(".cm-time").first()).toBeVisible();
  });

  test("controls stay inside short video frames", async ({ page }) => {
    await open(page, "![A gray clip](clip.webm)");
    const player = page.getByRole("group", { name: "A gray clip" });
    await expect(player.locator(".cm-time").last()).toHaveText("0:04");
    await player.locator("video").evaluate((video) => {
      video.style.aspectRatio = "16 / 9";
      video.style.objectFit = "contain";
    });
    for (const width of [240, 320, 375]) {
      await page.locator("body").evaluate((body, width) => {
        body.style.width = `${width}px`;
      }, width);
      const frame = (await player.boundingBox())!;
      const controls = [".cm-play", ".cm-mute", ".cm-settings", ".cm-seek", ".cm-full"];
      const boxes = await Promise.all(
        controls.map(async (selector) => (await player.locator(selector).boundingBox())!),
      );
      for (const [index, box] of boxes.entries()) {
        const selector = controls[index];
        expect(box.x, `${selector} left at ${width}px`).toBeGreaterThanOrEqual(frame.x);
        expect(box.y, `${selector} top at ${width}px`).toBeGreaterThanOrEqual(frame.y);
        expect(box.x + box.width, `${selector} right at ${width}px`).toBeLessThanOrEqual(
          frame.x + frame.width,
        );
        expect(box.y + box.height, `${selector} bottom at ${width}px`).toBeLessThanOrEqual(
          frame.y + frame.height,
        );
        for (const other of boxes.slice(index + 1)) {
          const overlapX =
            Math.min(box.x + box.width, other.x + other.width) - Math.max(box.x, other.x);
          const overlapY =
            Math.min(box.y + box.height, other.y + other.height) - Math.max(box.y, other.y);
          expect(overlapX > 0 && overlapY > 0, `${selector} overlaps a control at ${width}px`).toBe(
            false,
          );
        }
      }
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
  await page.route("**/portrait.webm", serve(portrait, "video/webm"));
  await open(page, "![Silence](silence.wav)\n\n![A portrait clip](portrait.webm)", {
    script: false,
  });
  const player = page.getByRole("group", { name: "Silence" });
  await expect(player.locator("audio")).toBeVisible();
  await expect(player.locator(".cm-bar")).toBeHidden();
  const clip = page.getByRole("group", { name: "A portrait clip" });
  await expect(clip.locator("video")).toHaveAttribute("controls");
  await expect(clip.locator(".cm-bar")).toBeHidden();
  await expect(clip.locator("video")).toHaveJSProperty("videoWidth", 180);
  await expect(clip.locator("video")).toHaveJSProperty("videoHeight", 320);
  await expect(clip).not.toHaveAttribute("data-media-ready");
  const frame = (await clip.boundingBox())!;
  const video = (await clip.locator("video").boundingBox())!;
  expect(frame.width - video.width).toBeLessThanOrEqual(2);

  await open(page, "![Missing](missing.wav)");
  const missing = page.getByRole("group", { name: "Missing" });
  await expect(missing).toHaveAttribute("data-error");
  await expect(missing.locator("audio")).toBeVisible();
  await expect(missing.locator(".cm-bar")).toBeHidden();
});
