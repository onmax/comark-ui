# Recording motion

A clip is evidence when the reviewer sees the motion at its real speed, starting and ending at rest, with nothing else on screen changing.

## 1. Script the interaction

Drive the page with a script, such as Playwright, so a retake repeats the same steps at the same pace.

- Size the viewport to the component, the way you'd clip a still. The viewport is the frame.
- Rest about 0.7 s before each action and longer than the animation after it, about 1.3 s, so every motion starts and ends on a still frame.
- Show the motion two or three times, such as three tab switches, and keep the clip to a few seconds.
- Draw a pointer. A headless browser draws none, and without one the reader sees things change with nothing pressing them. Move the mouse to its target in steps, not in one jump.

## 2. Capture the frames

Chrome's screencast sends a lossless PNG each time the page paints. Playwright's `recordVideo` is simpler, but it starts recording during page load and its VP8 encoding blurs small text.

Both capture CSS pixels, whatever `deviceScaleFactor` says. For sharp text, lay the page out at double size: double the viewport, the root `font-size`, and any font sizes set in `px`. Keep CSS `zoom` and `transform` off the page. Motion code often measures boxes with `getBoundingClientRect`, and under either one it draws its moving parts in the wrong place. On a tab transition recorded with `zoom: 2`, the leaving tokens appeared below the code block.

Save this as `record.mjs` in a workspace with `@playwright/test` and its Chromium browser installed, with ffmpeg on `PATH`. Adjust the viewport and tab names for the page, then run `node record.mjs <url>` with the page's URL.

```js
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const url = process.argv[2];
if (!url) throw new Error("Usage: node record.mjs <url>");

const width = 1456,
  height = 340,
  dir = "clip"; // twice the component's CSS size
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height } });
await page.goto(url);
await page.addStyleTag({ content: "html{font-size:32px}" }); // plus any px fonts, doubled

// An arrow whose tip follows the mouse, so it leaves the label it points at readable.
const arrow = encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 20"><path d="M1 1v16l4-4 3 6 2-1-3-6h6z" fill="#111" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/></svg>',
);
await page.addStyleTag({
  content: `#pointer{position:fixed;left:0;top:0;z-index:9;width:28px;height:40px;background:url("data:image/svg+xml,${arrow}");pointer-events:none}`,
});
await page.evaluate(() => {
  const tip = document.body.appendChild(
    Object.assign(document.createElement("div"), { id: "pointer" }),
  );
  addEventListener("mousemove", (e) => (tip.style.translate = `${e.clientX}px ${e.clientY}px`));
});

const cdp = await page.context().newCDPSession(page);
const frames = [];
cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
  frames.push({ data, at: metadata.timestamp });
  cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
});
await cdp.send("Page.startScreencast", { format: "png", maxWidth: width, maxHeight: height });
await page.mouse.move(width - 80, height - 60); // paints the first frame
await page.waitForTimeout(700);
for (const name of ["Second", "Third", "First"]) {
  const box = await page.getByRole("tab", { name }).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 14 });
  await page.waitForTimeout(150); // lets the reader see where it presses
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(1300);
}
const end = Date.now() / 1000;
await cdp.send("Page.stopScreencast");
await browser.close();

// A frame arrives only when the page paints, so each one holds until the next.
let list = "";
frames.forEach((frame, i) => {
  writeFileSync(`${dir}/${i}.png`, Buffer.from(frame.data, "base64"));
  list += `file '${i}.png'\nduration ${((frames[i + 1]?.at ?? end) - frame.at).toFixed(4)}\n`;
});
writeFileSync(`${dir}/frames.txt`, `${list}file '${frames.length - 1}.png'\n`);
execFileSync("ffmpeg", [
  "-y",
  "-f",
  "concat",
  "-i",
  `${dir}/frames.txt`,
  "-vf",
  "fps=30,format=yuv420p",
  "-c:v",
  "libx264",
  "-crf",
  "18",
  "-movflags",
  "+faststart",
  "-an",
  `${dir}/clip.mp4`,
]);
```

The mp4 is H.264, so every browser plays it. A few seconds at this size come to a few hundred KB.

## 3. Look at the clip

Pull frames from the middle of a motion and from a rest, and look at them:

```sh
for t in 0.5 1.1 1.25 1.4; do ffmpeg -y -loglevel error -ss $t -i clip/clip.mp4 -frames:v 1 clip/at-$t.png; done
```

A frame from the middle of a motion shows what reviewers can't see in a still: parts in between their two places, fading, or drawn where they don't belong.

Done when a frame from the middle of each motion shows the motion your document describes, and the clip starts and ends at rest.

## 4. Write the document

Keep the shape of a before/after document, with the clip in place of the compare:

```md
Code groups with `magic` now slide the tokens their snippets share into place when you switch tabs. Before, the code swapped all at once.

Open a `::code-group{magic}` and select **tinyjson5**, then **tinyini**.

![Each tab switch slides import and from into place while the package names fade between them](magic-tabs.mp4){width=1456 height=340 autoplay loop muted}
```

- The first sentence says what moved before, so the after clip alone carries the comparison.
- The alt text says what moves, for a reader whose browser can't play the file.
- `autoplay loop muted` plays the clip like an animated screenshot. Browsers autoplay only muted video.
- `width` and `height` are the clip's pixels, so the page keeps its room before the file loads. `ffprobe -v error -show_entries stream=width,height -of csv=p=0 clip.mp4` prints them.
- When the change retimes motion that already existed, put the before clip first, recorded with the same script, and title each with a line above it.
