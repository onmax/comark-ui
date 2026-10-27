---
name: visual-explanation
description: Explains how something works with the smallest visual that answers the question, such as a sequence diagram, a call tree, a file tree, or a marked-up screenshot, placed beside the sentence it supports. Use when someone asks to be shown how a system, a flow, or a change works, or when the answer would otherwise take paragraphs of prose.
license: MIT
---

# Visual explanation

A good explanation answers one question with one picture the reader can check against the code. Prose carries the reasoning, and the visual carries the shape: what happens in what order, what calls what, what lives where. Each visual stands next to the sentence that tells the reader what to look for.

## 1. Name the question

Write the question in one sentence, in the reader's words: "What happens between `parseMarkdown` and the HTML?" If it's two questions, answer the one they asked and offer the other.

Done when the question fits on one line.

## 2. Pick the view

Choose by the shape of the answer:

| The answer is… | Draw |
| --- | --- |
| The order of events between parts | A `mermaid` sequence diagram or flowchart |
| Who calls whom | A call tree in a `text` fence, indented by call depth |
| Where code lives, or which files a change touches | `::file-tree`, with `+`, `-`, and `~` marks |
| The states something moves between | A `mermaid` `stateDiagram-v2` |
| Something on screen | `::screenshot` with measured marks |
| What a few lines do, line by line | A code fence with `// <1>` notes |
| How a number changed | `::chart` or a two-row table |

Use one primary view. Add a second only when it answers the question the first one raises, such as "where is that in my code?" after a flow diagram. [references/blocks.md](references/blocks.md) has the syntax of each.

Done when you can say, in one sentence, what the reader will see in the view.

## 3. Draw it from the source

Read the code, the product, or the data before you draw. Every box, arrow, file, and label in the view is something the reader can find: a real function name, a real file path, a state the code really has. Leave out the parts that don't bear on the question; a diagram of everything answers nothing.

Keep a diagram to about eight nodes or participants. Past that, split it by stage or zoom into the part the question is about.

Done when every label in the view exists in the source, and nothing in it is there only for completeness.

## 4. Write around it

[references/example.md](references/example.md) shows the shape:

1. A title that is the question, or its answer.
2. Two or three sentences with the answer in plain words, ending on what to look at in the view.
3. The view.
4. One or two sentences for what the view can't show, such as a rule that applies at every step.
5. A second view only if step 2 allowed one, with a sentence before it saying why it's there.

Done when the explanation reads top to bottom in under a minute and every visual has a sentence beside it.

## 5. Check the render

1. Lint it, and fix until it reports no problems:

   ```sh
   npx -p comark-linter -p comark-ui lint-comark explanation.md
   ```

2. Open the rendered page where it will be read and look at each view at the width the reader has. A diagram whose labels are too small to read needs fewer nodes, not a wider page.

Done when you've looked at the render and every label reads at its size.
