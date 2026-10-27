---
title: Skills
label: Overview
description: Agent skills that write whole Comark documents, from before/after evidence to lessons.
keywords: agent skills, Claude Code, Codex, Cursor, prompts, templates, PR evidence, code review, explainer, tutorial
tagline: Each skill teaches your agent one kind of document, what goes in it and in what order, and shows a finished example. Install the ones you need.
---

::skills
::

## Install

Each skill installs on its own, with the `skills` CLI:

```sh
npx skills add onmax/comark-ui --skill review-document
```

Leave out `--skill` to pick from every skill in the repository, the [comark-ui skill](/guide/agents/) included. That one teaches the syntax of every block; these teach a whole document. Each carries the syntax of the blocks it uses, so it works without the other.

## How they're written

- **A finished example first.** Each skill holds a complete document in `references/example.md`, the one rendered on its page, and the agent starts from its shape.
- **Judgment first.** The steps are the decisions that make a document trustworthy: two comparable captures, marks measured rather than guessed, evidence the reader can check, one question per explanation, one concept per lesson.
- **Done means checkable.** Every step ends with what done looks like, and every skill ends by linting the document and looking at the render.
- **Writing only.** Where a document lives and who opens it belongs to your host, such as [Drop](https://drop.vitehub.dev/?utm_source=comark-ui&utm_medium=skills).

## Bundle them in your app

An app that serves skills to its own agents imports them from `comark-ui`, so they match the plugins it renders with:

```ts
import { skills, version } from "comark-ui/skills";

const lesson = skills.find((skill) => skill.name === "concept-lesson");
for (const file of lesson.files) serve(`/skills/${lesson.name}/${file.path}`, file.text);
```

Each skill has its `name` and `description`, its parsed `frontmatter`, and its `files`, each a `path` from the skill's folder and its `text`, with `SKILL.md` first. The text is inlined, so a Worker serves it without reading `node_modules`. `version` is the comark-ui version they came from, for a cache key or a digest.

To install a skill as a folder instead, copy it whole, since `SKILL.md` links its references by path:

```ts
import { cp } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const folder = dirname(fileURLToPath(import.meta.resolve("comark-ui/skills/review-document/SKILL.md")));
await cp(folder, ".agents/skills/review-document", { recursive: true });
```
