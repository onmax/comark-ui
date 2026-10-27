---
title: Before/after evidence
description: Two comparable screenshots with measured marks, for any change people can see.
icon: git-compare
keywords: PR evidence, screenshots, visual review, visual diff, UI change
tagline: Your agent captures both states the same way, measures each mark from the page or the pixels, and checks the render before a reviewer opens it.
---

::skill{name="before-after-evidence"}
::

## Why it works

- **Comparable or nothing.** Both sides share a viewport, a state, and a clip, so the change is the only difference. When the agent can't capture one side that way, it says so instead of sending one image and a description.
- **Measured marks.** Each box comes from the element's position on the page, or from pixels when the image is a frame from a recording or an exported design. A guessed box on a half-width image lands on the neighbouring button.
- **The screen's own words.** Each note says what the screen shows, so the reviewer checks it against the image instead of taking it on trust.
- **Short on purpose.** One sentence, one line of steps, the compare. How the work went belongs in the agent's report, not the evidence.

## Use it

Ask the way you'd ask a teammate: "Add before and after screenshots of the invite dialog to the PR." The agent finds both states, captures them, measures the marks, writes the document, lints it, and looks at the render.

When the change is one finding among several, put the compare inside a [review document](/skills/review-document/).
