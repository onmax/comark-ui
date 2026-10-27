---
title: Review document
description: A verdict first, then each finding ranked with its location, evidence, and fix.
icon: clipboard-check
keywords: code review, PR review, audit, QA report, findings
tagline: Your agent writes the review a reader can act on in a minute, with the evidence that makes each finding hold up.
---

::skill{name="review-document"}
::

## What it does

The skill writes up a review that is already done: a **verdict** first, then only the findings that change it, each with where it is, its evidence, and its fix. It doesn't review anything. Run your usual review first, by hand, with a review skill, or with a tool, and the skill turns its findings into a page the reader acts on in a minute.

## When to use it

Ask once the review is done: "Write up your review of #418." Your agent also loads the skill for a design review, a QA pass, or an audit. To be sure, name it: "Use the review-document skill."

Choose by what you have:

- Findings from a code, design, or QA review, and a reader who must decide: this skill.
- A diff nobody has reviewed yet: your review process first, then this skill.
- One visible change to prove: [Before/after evidence](/skills/before-after-evidence/) alone. In a review, its compare becomes one finding's evidence.

## It's working if

- The callout on top says whether to merge, and names the finding behind it.
- Every finding has a rank, blocking first, and its title says what goes wrong and for whom.
- Each finding says whether it was reproduced or read in the code, so you know which ones to check yourself.
- The page ends with what was checked and what wasn't.
- No summary repeats the findings, and no list of what's good appears unless you asked for one.
