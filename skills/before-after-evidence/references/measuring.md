# Measuring marks

Every mark is `x y w h`, each a percentage of the image from 0 to 100. Measure in the same coordinates the image was captured in.

## A page you captured

Capture both states with one clip, then read each element's box in the same page, before anything moves:

```js
// Playwright: one clip for both sides, so the same element sits at the same place.
const clip = { x: 56, y: 12, width: 528, height: 312 };
await page.screenshot({ path: "after.png", clip });

const box = await page.$eval("#email", (el, clip) => {
  const r = el.getBoundingClientRect();
  return [
    ((r.x - clip.x) / clip.width) * 100,
    ((r.y - clip.y) / clip.height) * 100,
    (r.width / clip.width) * 100,
    (r.height / clip.height) * 100,
  ].map((v) => +v.toFixed(1));
}, clip);
// box is [x, y, w, h] for the annotation.
```

- Without a clip, divide by `innerWidth` and `innerHeight` and subtract nothing.
- For a full-page capture, add `scrollX` and `scrollY` to the box and divide by `document.documentElement.scrollWidth` and `scrollHeight`.
- An element that spans its container, such as a block paragraph, measures as wide as the container. Measure the text instead: give it `width: fit-content` while you capture, or measure a `Range` around its text.
- If an element crosses the clip's edge, cut its box at the edge, so every value stays between 0 and 100.

## A still you didn't capture

A frame from a screen recording, a design export, or an image attached to an issue has no DOM. Measure in pixels:

1. Read the image's natural size, such as with `magick identify frame.png` or `file frame.png`.
2. Find the target's rectangle in pixels in an image viewer that shows the pointer's coordinates.
3. Divide: `x = left / width * 100`, `y = top / height * 100`, `w = boxWidth / width * 100`, `h = boxHeight / height * 100`.
4. Crop the image to that rectangle and look at the crop. It should show the target and little else:

   ```sh
   magick frame.png -crop 320x38+44+134 +repage crop.png
   ```

   With Python and Pillow, `Image.open("frame.png").crop((44, 134, 364, 172)).save("crop.png")` does the same.

For a pair of video frames, take both at the same playback size and use the same crop for both, as you would clip two page captures.

## In the render

The rendered page is the last check. A mark that misses there has the wrong numbers: measure it again from the source.
