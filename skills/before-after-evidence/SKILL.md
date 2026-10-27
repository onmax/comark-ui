---
name: before-after-evidence
description: Shows a visible change as two comparable screenshots, before and after, with marks measured from the source and checked in the rendered page. Use when a pull request, bug fix, or design change alters what people see, or when someone asks for before/after screenshots or visual evidence.
license: MIT
---

# Before/after evidence

A before/after is evidence when a reviewer can check every claim against the two images and nothing else. Three things make it so, and the reader can't repair any of them: two captures of the same view, marks that sit on what changed, and notes in the words the screen shows.

This skill writes the document. Where it's published, and who can open it, is up to your host.

## 1. Capture a comparable pair

Take **after** from the branch or its preview, and **before** from a deployment or commit that still behaves the old way. Capture both with the same viewport, zoom, theme, data, scroll position, and open menus, so the change is the only difference.

- Set up the state that shows the change before you capture: the long name that wrapped, the error that stayed hidden, the empty list.
- Clip both captures to one region around the change, the same rectangle on each side. A `::compare` gives each image under half the page width, where a full-page capture's text is too small to read.
- Pin anything that moves the layout between the two states, such as a dialog centered vertically that grows by one line, so the same element sits at the same place in both.

If one side can't be captured comparably, stop and say what blocked you. A description in place of a screenshot, or one side alone, isn't before/after evidence.

Done when both images exist, have the same size, and differ only where the change is.

## 2. Measure every mark

Marks take `x`, `y`, `w`, and `h` as percentages of the image. Measure them: an estimate drifts a few percent, and on a half-width image that's the neighbouring button.

- **A page you captured:** read the element's box in the same browser, viewport, and state, minus the clip's offset. [references/measuring.md](references/measuring.md) has the snippet.
- **A still you didn't capture**, such as a frame from a screen recording, a design export, or an image attached to a bug report: there is no DOM to ask. Measure in image pixels and divide by the image's natural width and height. Confirm each box by cropping the image to it and looking at the crop, as the same reference shows.

Mark the change at its own size: the field, the label, the button. Use `red` on the before side for the problem and `green` on the after side for the fix, and leave what stayed the same unmarked. Two or three marks a side usually tell the whole story.

Done when every mark has numbers you measured, and you can name the element or the pixel rectangle each came from.

## 3. Write the document

Start from [references/example.md](references/example.md) and keep its shape:

1. One sentence: what changed, and for whom.
2. One line of steps to reach the screen, so a reviewer can reproduce it.
3. The `::compare`, each note a few words in the screen's own words. A value the screenshot doesn't show stays out of its note.
4. A `::diff` of the line that caused it, only when the reader would otherwise ask.

The images carry the evidence, so the text only points into them. How the work went (the checks you ran, retries, CI) goes in your report to the user, not in the document. [references/blocks.md](references/blocks.md) has the syntax of each block.

Image `src` must be a URL the renderer can reach: a path next to the document, or an https URL your host gives you for the upload.

## 4. Check the render

1. Lint it, and fix until it reports no problems:

   ```sh
   npx -p comark-linter -p comark-ui lint-comark evidence.md
   ```

2. Open the page where it will be read and take a screenshot of it. For a local screenshot-only check, copy the complete `::compare` block, including its nested screenshots and annotations, into `evidence-screenshots.md` beside `evidence.md`, then run:

   ```sh
   npx comark-annotate render evidence-screenshots.md -o evidence-screenshots.html
   ```

   Open `evidence-screenshots.html` and take a screenshot of it. This CLI renders annotate, carousel, and zoom only; check any `::diff` or other blocks in the host's full Comark UI preview.
3. Check that each mark sits on its target and each note matches what its side shows. Measure a mark that misses again, from the source, since a box moved by eye stays a guess.

Done when you've looked at the rendered page and every mark lands. Name any mark or block you couldn't check in your report.
