---
title: Skills
label: Overview
description: Agent skills that write whole Comark documents, from before/after evidence to lessons.
keywords: agent skills, Claude Code, Codex, Cursor, prompts, templates, PR evidence, code review, explainer, tutorial
tagline: Each skill teaches your agent one kind of document, what goes in it and in what order, and shows a finished example. Install the ones you need.
---

::skills
::

## Which one

- A change people can see needs proof on a pull request: [Before/after evidence](/skills/before-after-evidence/).
- A review is done, and someone has to decide what to do: [Review document](/skills/review-document/).
- Someone asked how a system, a flow, or a change works: [Visual explanation](/skills/visual-explanation/).
- Someone needs to learn one concept and check that they did: [Concept lesson](/skills/concept-lesson/).
- Your agent needs the syntax of a block, not a whole document: the [comark-ui skill](/guide/agents/).
- A diff needs reviewing: your review process. These skills write documents; they don't find problems.
- The document needs a link, comments, or saved answers: your host, such as [Drop](https://drop.vitehub.dev/?utm_source=comark-ui&utm_medium=skills).

## Install

Install them with the `skills` CLI:

```sh
npx skills add onmax/comark-ui
```

It lists every skill in the repository, the comark-ui skill included, and installs the ones you pick. Each document skill carries the syntax of the blocks it uses, so it works without comark-ui.

## Use them

Ask in your own words, such as "Write up your review of #418." Your agent loads the skill whose description matches the request. To be sure it does, name the skill: "Use the review-document skill." The skills work together: a review document carries a before/after compare as one finding's evidence.

Each skill starts from a finished example, the one rendered on its page, and every step ends with a condition the agent checks before the next. Before it hands the document over, the agent lints it with `npx` and looks at the render, so it needs Node and a browser it can open a page in.

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
