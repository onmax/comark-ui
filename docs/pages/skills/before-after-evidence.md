---
title: Before/after evidence
description: Two comparable screenshots with measured marks, for any change people can see.
icon: git-compare
keywords: PR evidence, screenshots, visual review, visual diff, UI change
tagline: Your agent captures both states the same way, measures each mark from the page or the pixels, and checks the render before a reviewer opens it.
---

::skill{name="before-after-evidence"}
::

## What it does

The skill turns a visible change into a `::compare` of two screenshots, so a reviewer can check it without running the branch. It sends both sides or neither. If it can't capture the old state the same way as the new one, it stops and tells you what blocked it.

## When to use it

Ask in your own words, such as "Add before and after screenshots of the invite dialog to the PR." Your agent loads the skill for requests about a visible change. To be sure, say "Use the before-after-evidence skill."

Choose by what you want:

- Proof that a UI change, bug fix, or design change looks right: this skill.
- A review with several findings, one of them visible: [Review document](/skills/review-document/), with this compare as that finding's evidence.
- How a screen or flow works, not what changed: [Visual explanation](/skills/visual-explanation/).

## What your agent needs

- **A browser it can drive**, such as Playwright, to capture both states and read each mark's box from the page. With only a screen recording or a design export, it measures marks in pixels.
- **Both states of the change**, as deployments or commits it can run, or comparable images from a recording or design export.

## It's working if

- The two images are the same size and differ only where the change is.
- Each mark sits on the field, label, or button that changed, red before and green after, and nothing unchanged is marked. A guessed box on a half-width image lands on the neighbouring button, so the agent measures every mark.
- Each note uses words visible on its side.
- The document is one sentence, one line of steps to reach the screen, and the compare. Test runs and retries go in the agent's report to you, not in the evidence.
- The report names any mark the agent couldn't check in the render.
