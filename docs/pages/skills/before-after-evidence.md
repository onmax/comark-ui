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

The skill turns a change people can see into a `::compare` of two screenshots that a reviewer checks without running the branch. It sends both sides or neither. When it can't capture the old state the same way as the new one, it stops and tells you what blocked it, instead of sending one screenshot and a description.

## When to use it

Ask in your own words: "Add before and after screenshots of the invite dialog to the PR." Your agent loads the skill when a request is about a visible change. To be sure, name it: "Use the before-after-evidence skill."

Choose by what you want:

- Proof that a UI change, bug fix, or design change looks right: this skill.
- A review with several findings, one of them visible: [Review document](/skills/review-document/), with this compare as that finding's evidence.
- To show how a screen or a flow works, not what changed: [Visual explanation](/skills/visual-explanation/).

## What your agent needs

- **A browser it can drive**, such as Playwright, to capture both states and read each mark's box from the page. With only a screen recording or a design export, it measures the marks in pixels instead.
- **The old behavior, still running**: a deployment, a preview of the base branch, or a commit it can start.

## It's working if

- The two images are the same size and differ only where the change is.
- Each mark sits on the field, label, or button that changed: red on the before side, green on the after side, and nothing unchanged marked. A guessed box on a half-width image lands on the neighbouring button, so the marks are measured.
- Each note uses words you can see on its side.
- The document is one sentence, one line of steps to reach the screen, and the compare. Test runs and retries are in the agent's report to you, not in the evidence.
- The report names any mark the agent couldn't check in the render.
