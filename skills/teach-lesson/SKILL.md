---
name: teach-lesson
description: Writes a short lesson on one concept in simplified English, with a worked example and a question the reader answers. Use when someone asks to learn or understand one concept, wants a tutorial or self-check they can test themselves on, or needs onboarding on one idea.
license: MIT
---

# Teach lesson

A lesson teaches one concept through a worked example and an application question. Keep it short enough to finish in five minutes.

## 1. Pin the concept and the outcome

Infer the reader's purpose and existing knowledge from the conversation. Focus on the gap their question reveals.

Name one concept and write a testable outcome, such as "Predict what happens when two people save the same record." Use a verb such as predict, explain, choose, or spot.

If the outcome depends on another concept, link to its prerequisite lesson or teach that prerequisite first.

Done when one sentence names the action the reader will perform and the situation they will apply it to.

## 2. Find a worked example

Pick a case from the reader's world where the concept prevents a visible failure. Trace it in three or four moves with concrete names, status codes, or numbers. Label invented values as illustrative.

Verify behavior against a primary source, such as code or a specification. For an existing design, find recorded reasons when available. Distinguish verified behavior, recorded reasons, and inferred reasons. Preserve uncertainty such as "likely", and say when a reason is unknown.

Done when each move has a concrete value, its behavior matches the source, and each design reason is sourced or qualified.

## 3. Write the lesson

Read [references/example.md](references/example.md) as a model for the complete lesson. Write these parts in order:

1. **The outcome**, one sentence under the title.
2. **Why it matters**: the failure the concept prevents, told as the worked example's problem. Three or four sentences.
3. **The idea**: give the smallest complete explanation in at most four sentences. Start with a plain definition, connect it to the reader's case, and explain how it solves the problem.
4. **The worked example**: add the supporting detail, one move per step, showing the value that changed. For text and code, use [`::steps`](references/blocks.md#the-worked-example-steps). When diagrams help explain interacting parts, use the [diagram series guidance](references/blocks.md#build-a-diagram-across-steps).
5. **The check**, below.
6. **Read next**: one primary source, linked to the exact section, and the lesson that naturally follows.

### Use STE 100 writing rules

Apply [ASD-STE100 Simplified Technical English](https://asd-ste100.org/) writing rules to the whole lesson, including the example, question, hints, and answer explanations.

- Give each sentence one idea. Give each instruction one action.
- Keep instructions within 20 words and descriptive sentences within 25 words. Use short paragraphs.
- Use common words and active voice. Write instructions as direct commands.
- Define each technical term in bold at first use. Use one term for each concept and keep its meaning consistent.
- Keep technical names, code, units, and UI labels exact.
- Put a condition before the action it controls. Make each pronoun refer to one clear subject.
- Use literal wording and explain abbreviations. Split long noun groups into phrases.
- State the mechanism directly, with the detail needed to follow it.

Done when the outcome, problem, idea, worked example, and source link are present. Each term must have a definition before use, and each sentence must meet the applicable word limit. Preserve the example's behavior and evidence confidence.

## 4. Write the check

Use [`::question`](references/blocks.md#the-check-question) to test the outcome. Change one input of the worked example and ask the reader to predict, explain, choose, or spot the result.

- Make each wrong option a real misconception, and give it a `>` rationale that says why it's tempting and why it's wrong.
- Keep the options parallel, one idea each and close in length, so their shape gives no clue to the answer.
- Add `#explain` for the one thing the reader should take away. It opens after the right answer or Show answer, so it must resolve every misconception the wrong options carry.
- For a fact worth remembering a week later, optionally add a [`::recall` card](references/blocks.md#the-fact-to-keep-recall).

Done when the question tests the stated outcome with one changed input, every option has a rationale, and the shared explanation resolves each misconception.

## 5. Check the render

1. Lint it, and fix until it reports no problems:

   ```sh
   vp dlx --package comark-linter --package comark-ui comark-lint lesson.md
   ```

   These commands use the [global Vite+ CLI](https://viteplus.dev/guide/global-cli). Without it, `pnpm dlx` takes the same arguments.

2. Open the rendered page where it will be read. Select each option and check its rationale. Pick the right option, or press Show answer, and check the shared explanation.

Done when lint reports no problems, every worked step and diagram is visible, and each option reveals its rationale. Confirm that the correct answer follows from the example and that the lesson fits a five-minute read.
