---
title: Teach lesson
description: One concept in simplified English, a worked example, and a question to check that you can apply it.
icon: graduation-cap
keywords: tutorial, teach, onboarding, explainer, quiz, learning
tagline: Your agent writes a five-minute lesson that ends with the reader applying the idea, not just reading it.
---

::skill{name="teach-lesson"}
::

## What it does

The skill writes **one lesson on one concept** that takes five minutes. You get the outcome, the idea, a worked example, and a question that changes one input of that example.

It fits the depth to your question and what you know. A plain definition leads to how the concept works and why it solves your problem, and the example adds detail. When diagrams help, each one redraws the last with the next part added.

For an existing system, it checks behavior against the sources and looks for recorded design reasons. It labels reasons it inferred and says what's uncertain.

The lesson, its question, and the answer explanations follow the ASD-STE100 Simplified Technical English rules. Sentences are short, each term keeps one meaning, and technical names stay exact.

The skill keeps no record of what you've learned. A second concept gets its own lesson, linked at the end. Your browser or a host such as [Drop](https://drop.vitehub.dev/?utm_source=comark-ui&utm_medium=skills) can save answers.

## When to use it

Ask "Teach me how ETags prevent lost updates" or "Write a lesson on React keys for new hires." Your agent loads the skill when someone asks to learn or understand a concept. To be sure, say "Use the teach-lesson skill."

Choose by what you want:

- One idea, learned and checked in a few minutes: this skill.
- How a system works, with no check: [Visual explanation](/skills/visual-explanation/).
- A course over many sessions that remembers what you've learned: a tutor skill such as Matt Pocock's [teach](https://github.com/mattpocock/skills/tree/main/skills/productivity/teach), which this skill draws on.

Its reader context, how-and-why explanation, evidence handling, and step-by-step diagrams draw on [pstack's teach skill](https://github.com/cursor/plugins/blob/main/pstack/skills/teach/SKILL.md). They're built in, so this skill installs on its own.

## It's working if

- The outcome under the title uses a verb a question can test, such as predict, explain, or choose.
- The idea starts with a plain definition and ties it to your case.
- The explanation separates verified behavior from inferred design reasons.
- Each step of the worked example shows the value that changed.
- Instructions are at most 20 words, and descriptive sentences at most 25.
- Each technical term is explained at first use and keeps one meaning.
- The question changes one input of the example instead of asking for the definition back.
- Each wrong option is a real mistake, and picking it says why it's tempting and why it's wrong.
- You can't spot the right answer by its length or place, since comark-quiz shuffles the options.
- The lesson ends with one primary source, linked to the exact section.
