---
title: Review document
description: A verdict first, then each finding ranked with its location, evidence, and fix.
icon: clipboard-check
keywords: code review, PR review, audit, QA report, findings
tagline: Your agent writes the review a reader can act on in a minute, with the evidence that makes each finding hold up.
---

::skill{name="review-document"}
::

## Why it works

- **The decision on top.** A reader who stops after the callout still knows whether to merge, and why.
- **Only findings that change it.** Findings with one cause merge into one, each gets a rank, and preferences stay out unless the reader asked for them.
- **Evidence the reader can check.** A failing test beats a screenshot, which beats the lines of code, which beat an argument. The document says which one each finding has, so "reproduced" and "read in the code" never look alike.
- **Honest scope.** It ends with what was checked and what wasn't, so the reader trusts the parts that were real.

## Use it

Ask once the review is done: "Write up your review of #418." The skill organizes findings you have; it doesn't search for new ones, so pair it with whatever review process you already run.

When a finding is a visible change, its evidence is a compare from [Before/after evidence](/skills/before-after-evidence/).
