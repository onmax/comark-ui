---
name: teach-lesson
description: Teaches one concept in simplified English, with a worked example and a question that checks the reader can apply it. Use when someone asks to learn a concept, wants a lesson they can test themselves on, or needs onboarding on one idea.
license: MIT
---

# Teach lesson

A lesson is a single win: the reader finishes able to do one thing they couldn't before, and proves it by answering a question. It's short enough to finish in five minutes, because working memory is small and a second concept crowds out the first. A course is many lessons; this skill writes one.

## 1. Pin the concept and the outcome

Infer the reader's purpose and existing knowledge from the conversation. Put detail where their question is, and skip what they already know.

Name one concept and write the outcome as a verb the check can test: "After this lesson you can predict what a server does when two people save the same record." Prefer predict, explain, choose, or spot over know or understand, which no question can test.

If the outcome needs two concepts, write the prerequisite's lesson first or link to it, and keep this one to the other.

Done when the outcome is one sentence with a testable verb.

## 2. Find a worked example

Pick a case from the reader's world where the concept changes what happens: without it something visibly goes wrong, with it the thing works. Use real values (names, status codes, numbers) so each step can be followed, not just nodded at.

Verify how the concept works against a primary source, such as code or a specification. For an existing design, find recorded reasons when available. Separate observed behavior from inferred reasons, and say when the reason is unknown. Label invented example values as illustrative.

Done when you can tell the example's story in three or four moves, each with a concrete value.

## 3. Write the lesson

Follow [references/example.md](references/example.md), in this order:

1. **The outcome**, one sentence under the title.
2. **Why it matters**: the failure the concept prevents, told as the worked example's problem. Three or four sentences.
3. **The idea**: start with a plain definition, then connect it to the reader's case. Explain how it works and why it solves the problem. Use at most four sentences, defining each new term in bold once, where it's first used. One term per lesson is plenty; a second needs its own lesson.
4. **The worked example**, one move per step, each showing the value that changed. Use `::steps` for text and code. For a diagram series, use numbered Markdown headings with Mermaid fences outside `::steps`.
5. **The check**, below.
6. **Read next**: one primary source, linked to the exact section, and the lesson that naturally follows.

Give the smallest complete explanation in the idea section. Put the supporting detail in the worked example. Describe what happens as someone uses the system, with the values that change.

When a diagram helps explain several interacting parts, build it across the worked example's steps. Redraw the previous diagram and add the next part or relationship. Keep existing labels and positions consistent. Use the Mermaid syntax in [references/blocks.md](references/blocks.md).

State the explanation directly. Cut stock framing such as "the key insight" and announcements such as "this is the tricky part".

Done when the lesson reads in five minutes and every term in the check was defined above it.

### Use STE 100 writing rules

Apply [ASD-STE100 Simplified Technical English](https://asd-ste100.org/) writing rules to the whole lesson, including the example, question, hints, and answer explanations.

- Give each sentence one idea. Give each instruction one action.
- Keep instructions within 20 words and descriptive sentences within 25 words. Use short paragraphs.
- Use common words and active voice. Write instructions as direct commands.
- Explain each technical term at first use. Use one term for each concept and keep its meaning consistent.
- Keep technical names, code, units, and UI labels exact.
- Preserve uncertainty from the evidence. Keep "likely" or "unknown" when simplifying an inferred explanation.
- Put a condition before the action it controls. Make each pronoun refer to one clear subject.
- Avoid idioms, unexplained abbreviations, long noun groups, and unnecessary words.

Done when the lesson follows these writing rules and keeps the example's technical meaning.

## 4. Write the check

The check is what turns reading into learning, since recalling and applying an idea is what makes it stick. Use `::question` and ask the reader to **apply** the idea to a variant of the worked example: change one input and ask what happens. A question that only asks for the definition back tests recall of words, not the concept.

- Make each wrong option a real misconception, and give it a `>` rationale that says why it's tempting and why it's wrong.
- Keep the options parallel, one idea each and close in length, so the right one can't be spotted by its shape. comark-quiz shuffles them.
- Add `#explain` for the one thing the reader should take away whatever they picked.
- Optionally, add one `::recall` card for the single fact worth remembering a week from now.

[references/blocks.md](references/blocks.md) has the syntax for `::steps`, `::question`, and `::recall`.

Done when a reader who skipped the idea section would likely pick a wrong option, and one who read it would pick the right one.

## 5. Check the render

1. Lint it, and fix until it reports no problems:

   ```sh
   npx -p comark-linter -p comark-ui lint-comark lesson.md
   ```

2. Open the rendered page where it will be read, answer the question once wrongly and once rightly, and read each rationale as the reader would.

Done when every option's rationale makes sense after picking it.
