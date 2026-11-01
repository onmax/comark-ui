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

The skill writes up a finished review, with a **verdict** first and then only the findings that change it, each with its location, evidence, and fix. It doesn't review anything. Run your usual review first, and the skill turns its findings into a page a reader acts on in a minute.

## When to use it

Ask once the review is done, such as "Write up your review of #418." Your agent also loads it for a design review, a QA pass, or an audit. To be sure, say "Use the review-document skill."

Choose by what you have:

- Findings from a code, design, or QA review, and a reader who must decide: this skill.
- A diff nobody has reviewed yet: your review process first, then this skill.
- One visible change to prove: [Before/after evidence](/skills/before-after-evidence/) alone. Inside a review, its compare is one finding's evidence.

## It's working if

- The callout on top says whether to merge and names the finding behind it.
- Every finding has a rank, blocking first, and a title that says what goes wrong and for whom.
- Each finding says whether the agent reproduced it or read it in the code, so you know which to check yourself.
- The page ends with what the agent checked and what it didn't.
- No summary repeats the findings, and there's no list of what's good unless you asked for one.
