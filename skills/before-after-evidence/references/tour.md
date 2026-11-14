# Video tour

A tour is a video made from the compare's own screenshots. It zooms to each mark, draws it, writes its note, cuts from before to after at the same place, and ends on the whole after. It gives a reviewer who won't study two half-width images a way in. The compare stays the evidence: the tour shows nothing the screenshots don't.

## When to make one

- The document has two or more marks, or several compares.
- Skip it for one small change, such as a label: the compare says it at a glance.
- Skip it for motion. Record that, as [recording.md](recording.md) describes; a tour of stills can't show it.

## 1. Check it on one image

comark-annotate is already a direct dependency from step 4 of the skill. Add the canvas it draws with, then render 12 of the tour's frames on one image:

```sh
pnpm add -D @napi-rs/canvas
vp exec comark-annotate tour evidence.md --sheet tour-sheet.png
```

It draws with no browser. Look at the sheet:

- Each loop sits on what its note names, as it does on the page.
- Each note reads whole, beside its mark.
- Before and after alternate where the change is in one place on both sides.

A loop that misses its target comes from its annotation's box. Measure it again, as step 2 of the skill says, and render again; the tour has nothing to adjust by hand.

Done when every frame on the sheet shows a mark on its target or the whole screenshot.

## 2. Render the video

```sh
vp exec comark-annotate tour evidence.md -o tour.mp4
```

It needs ffmpeg on the `PATH`. A 30-second tour is 1 to 4 MB at 1920×1080.

## 3. Place it

Put it under the compare, after one line that says what it is, so no reader takes it for more evidence:

```md
A tour of the same screenshots, change by change:

![A tour of the toolbar change: Filters wrap before, one row after](tour.mp4){width=1920 height=1080}
```

The alt text names the changes it walks through, for a reader whose browser can't play it. In a GitHub pull request description, a link to an MP4 hosted elsewhere doesn't play: drop the file into the description, so GitHub uploads it and the video plays there.
