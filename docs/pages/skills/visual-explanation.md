---
title: Visual explanation
description: One question answered with the smallest diagram, tree, or screenshot that shows it.
icon: workflow
keywords: explainer, architecture, how it works, diagram, walkthrough, show me
tagline: Your agent picks the view by the shape of the answer, draws it from the real code, and puts each picture beside the sentence it supports.
---

::skill{name="visual-explanation"}
::

## What it does

The skill answers **one question** about how something works with the smallest view that shows the answer: a sequence diagram for the order of events, a call tree for who calls whom, a file tree for where code lives, a marked screenshot for something on screen. Every label in the view comes from the real source, so you can check the picture instead of trusting it. Asked two questions, it answers the one you asked and offers the other.

## When to use it

Ask "Show me how a document becomes HTML" or "Explain how the cache invalidates, with a diagram." Your agent loads the skill when you ask to be shown how a system, a flow, or a change works. To be sure, name it: "Use the visual-explanation skill."

Choose by what you want:

- To see how something works: this skill.
- To be able to apply an idea afterwards, and check that you can: [Concept lesson](/skills/concept-lesson/).
- To see what a change did to a screen: [Before/after evidence](/skills/before-after-evidence/).

## It's working if

- The title is the question, or its answer.
- The page reads top to bottom in under a minute, with a sentence beside each view saying what to look at.
- Every function, file, and state in the view is one you can find in the code.
- A diagram has about eight nodes or fewer, and its labels read at the page's width.
- A second view appears only to answer the question the first one raises.

The skill draws on the show-me skill by Dex Horthy at [Humanlayer](https://github.com/humanlayer/skills).
