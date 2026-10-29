# Screenshots and compares

comark-annotate draws `::screenshot` and `::compare`. Their marks take the values under Marks in SKILL.md.

## Choose the layout

Pick what explains the change best:

- One `::screenshot` with marks, when a single state shows the point.
- A `::compare` of two screenshots, when the change is the point. Capture both at the same viewport, zoom, scroll, and page state, and set the same `viewport` on both. Each image gets under half the page width, where the text of a full-page capture is too small to read, so clip both captures to the same region around the change, such as Playwright's `screenshot({ clip })`.
- `::compare{mode="slider"}` instead, when both screenshots show the same spot and the change is small, such as a number or a label at the same place. The reader drags a divider across one full-width image instead of reading two half-width ones. Side notes become numbered notes there, so skip `side`.
- A side note for the two or three points that matter most. With `mark="none"` and `to` on the exact spot, the arrow alone points and nothing covers the screen, which reads cleanest. Other notes stay numbered in the list under the image. In a side-by-side compare only `top` and `bottom` keep their arrows; left and right notes join the list.

For a review the reader should follow without a key, write it the way a designer marks up a board: the default ink with no `color`, every note a side note in the margin nearest its point, set off with `at` so its arrow sweeps in, and a `bracket` where a note covers a run of rows. Write the notes of a compare as a pair that argue the change: "The type gets the headline…" on the before, "The message becomes the starting point." on the after.

Mark the change at its own size: the bar, field, or label that changed. What stayed the same goes unmarked, or in one sentence above the screenshots. Keep it to about six marks per screenshot, fewer in a compare.

## Syntax

```md
::compare
:::screenshot{src="before.png" alt="Filter toolbar wrapping onto a second row" viewport="1440x900" href="https://pr12.preview.example.com/correlations"}
::::annotation{x=3.6 y=20.6 w=92.9 h=31.4 color="red"}
Moon phase and vibes don't fit, so the toolbar wraps and pushes the table down.
::::
:::

:::screenshot{src="after.png" alt="Filter toolbar on one row" viewport="1440x900"}
::::annotation{x=87.6 y=24.2 w=7.4 h=9.9 mark="check" color="green"}
**Apply** lines up with the chips.
::::
:::
::
```

- `::compare`: `title` is optional and names the comparison for screen readers. `mode` is `columns` (default, side by side) or `slider`. `ink` colors every annotation in both screenshots that doesn't set its own `color`. Its two screenshots are titled Before and After unless they set their own.
- `::screenshot`: `src` and `alt` are required; `title` (the heading above the image), `href` (the captured page, linked by its host), `viewport` (like `1440x900`), and `ink` are optional. Other content becomes the caption.
- `::annotation`: `x y w h` are required percentages of the image, numbers from 0 to 100 without `%`. `mark` is `box` (default), `circle`, `underline`, `line` (straight through the middle, along the longer side), `highlight`, `bracket`, `cross`, `check`, or `none`, which needs a `side`. `color` is `violet` (default) to point something out, `red` for a problem, `amber` for a warning, `green` for a fix, `blue` for a second voice, `gray` for neutral, or a 3- or 6-digit hex color. `side` is `top`, `bottom`, `left`, or `right`; keep top or bottom notes at least a quarter of the image apart and left or right notes an eighth apart.
- `at` moves a side note along its margin, as a percentage of the image (across for top and bottom, down for left and right). A note set off from its point reads away from it, so put it on the side with room: a top note at `at=40` pointing left of 40 reads to the right. `to="x,y"` is the point the arrow lands on, measured like the box; without it the arrow meets the middle of the mark's facing edge. Both need a `side`.
- Annotations must be direct children of a screenshot.

## Measure every mark

Take each mark's coordinates from the page, in the browser you captured. Measure the element and divide by the viewport:

```js
const r = document.querySelector("SELECTOR").getBoundingClientRect();
[(r.x / innerWidth) * 100, (r.y / innerHeight) * 100, (r.width / innerWidth) * 100, (r.height / innerHeight) * 100].map((v) => +v.toFixed(1));
```

For a full-page screenshot, add `scrollX`/`scrollY` and divide by `document.documentElement.scrollWidth` and `scrollHeight` instead.
For a clipped capture, `getBoundingClientRect()` and Playwright's main-frame `clip` both use viewport-relative coordinates, so the formula takes no scroll offsets. Make sure the clip fully contains every marked element. Subtract the clip's `x` and `y` and divide by its `width` and `height`; if an element crosses the clip edge, intersect its measured rectangle with the clip before normalizing so every value stays between 0 and 100. If the clip is in document coordinates, convert it to viewport coordinates before subtracting.

## Preview

```sh
vp dlx comark-annotate render report.md -o report.html
```

`render` writes a standalone page of the screenshots and compares, and relative `src` paths resolve next to it. Without comark-linter, `vp dlx comark-annotate check report.md` lists these blocks' problems on its own. It names each one like `screenshot "after.png", annotation 2`, counting annotations within their screenshot, and exits with 1 while any remain.

## Register

- In `comark-ui`: on, in `comark-ui/html` only.
- Alone: `pnpm add comark @comark/html comark-annotate`, then `createHtmlRenderer({ plugins: [annotate()], components })` with both from `comark-annotate/html`. It renders only to HTML and takes no options. Each document inlines the styles once, with style attributes for positions, so a strict Content Security Policy needs `style-src 'unsafe-inline'`.
