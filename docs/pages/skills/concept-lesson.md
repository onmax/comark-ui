---
title: Concept lesson
description: One concept, a worked example traced step by step, and a question to check it stuck.
icon: graduation-cap
keywords: tutorial, teach, onboarding, explainer, quiz, learning
tagline: Your agent writes a five-minute lesson that ends with the reader applying the idea, not just reading it.
---

::skill{name="concept-lesson"}
::

## What it does

The skill writes **one lesson on one concept**, short enough to finish in five minutes: the outcome, why it matters, the idea, a worked example with real values, and a question that asks you to apply the idea to a changed version of the example. It writes one lesson and keeps no record of what you've learned. A second concept gets its own lesson, linked at the end. Answers to the question are kept in the reader's browser, or by a host such as [Drop](https://drop.vitehub.dev/?utm_source=comark-ui&utm_medium=skills) that saves them.

## When to use it

Ask "Teach me how ETags prevent lost updates" or "Write a lesson on React keys for new hires." Your agent loads the skill when someone asks to learn or understand a concept. To be sure, name it: "Use the concept-lesson skill."

Choose by what you want:

- One idea, learned and checked in a few minutes: this skill.
- To see how a system works, with no check: [Visual explanation](/skills/visual-explanation/).
- A course over many sessions that remembers what you've learned: a tutor skill such as Matt Pocock's [teach](https://github.com/mattpocock/skills/tree/main/skills/productivity/teach), which this skill draws on.

## It's working if

- The outcome under the title uses a verb a question can test, such as predict, explain, or choose.
- Each step of the worked example shows the value that changed.
- The question changes one input of the example instead of asking for the definition back.
- Each wrong option is a mistake someone would make, and picking it says why it's tempting and why it's wrong.
- You can't spot the right answer by its length or its place, since comark-quiz shuffles the options.
- The lesson ends with one primary source, linked to the exact section.
