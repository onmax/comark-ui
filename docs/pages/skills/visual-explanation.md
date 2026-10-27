---
title: Visual explanation
description: One question answered with the smallest diagram, tree, or screenshot that shows it.
icon: workflow
keywords: explainer, architecture, how it works, diagram, walkthrough, show me
tagline: Your agent picks the view by the shape of the answer, draws it from the real code, and puts each picture beside the sentence it supports.
---

::skill{name="visual-explanation"}
::

## Why it works

- **One question.** The title is the question or its answer, so the reader knows what they'll learn before the first diagram.
- **The view fits the answer.** Order of events gets a sequence diagram, who calls whom a call tree, where code lives a file tree. The skill's table makes the choice.
- **Drawn from the source.** Every box and label is something the reader can find in the code, so the picture can be checked rather than trusted.
- **Small enough to read.** About eight nodes a diagram, and a second view only when it answers the question the first one raises.

## Use it

Ask "Show me how a document becomes HTML" or "Explain how the cache invalidates, with a diagram." The agent reads the code, then writes one page that answers the one question.

For a concept the reader should be able to apply afterwards, write a [lesson](/skills/concept-lesson/) instead. The skill draws on the show-me skill by Dex Horthy at [Humanlayer](https://github.com/humanlayer/skills).
