---
title: Agents
description: onmax's agent skill for every package, and the commands an agent uses to check what it wrote.
keywords: AI, Claude, Claude Code, Codex, Cursor, LLM, skills, agent skills, prompt
tagline: Agents write most review documents. Install the skill so yours knows the syntax, then let it check its own work before it hands the document over.
---

## Skill

[onmax](https://github.com/onmax)'s agent skill collects every package in one place: which block to use, its syntax, and how to check the result. Install it, or copy the command from the **For agents** button on any package's page:

```sh
vp dlx skills add onmax/comark-ui
```

The commands here run packages with `vp dlx` from [Vite+](https://viteplus.dev/), through your project's package manager. Without Vite+, `pnpm dlx` takes the same arguments. In a pnpm workspace that has a package only through another one, `npx` finds the package but not its command, and stops with `not found`.

The CLI lists every skill in the repository. Pick `comark-ui`. This site serves it too, so `vp dlx skills add https://comark-ui.onmax.me` installs the same skill.

A project that installs `comark-ui` can link the skill from `node_modules` instead, so it matches the installed version. Run `vp dlx skills experimental_sync` after each install; [Skills](/skills/#from-npm) shows how, and why the command is still experimental.

It teaches the blocks. To teach your agent a whole document, such as before/after evidence, a review, or a lesson, pick the [skills](/skills/) for those from the same list.

## Markdown pages

Every page on this site has a Markdown copy at its path plus `.md`, such as [`/zoom.md`](/zoom.md) for [`/zoom/`](/zoom/). A request for a page with `Accept: text/markdown` gets the copy too. The **Copy page** button on each page copies it, to paste into a chat.

[`/llms.txt`](/llms.txt) lists every page's copy by section, and says how an agent reads the site.

## Bundle the skill in your app

An app that renders these documents for its own agents, like [Drop](https://drop.vitehub.dev/?utm_source=comark-ui&utm_medium=guide), can ship this skill instead of writing one. `comark-ui` includes it, so the app copies it at build time and its agents always read the syntax of the plugins it installed:

```ts
import { cp } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const skill = dirname(fileURLToPath(import.meta.resolve("comark-ui/skills/comark-ui/SKILL.md")));
await cp(skill, "skills/comark-ui", { recursive: true });
```

Keep the folder whole, since `SKILL.md` links each reference by its path. An app that serves skills from a Worker, where it can't read `node_modules`, imports every skill's files as text from `comark-ui/skills` instead, as [Skills](/skills/#bundle-them-in-your-app) shows. If your agents only write Markdown, cut each reference at its `## Register` heading, which always comes last.

## Check the result

An agent should check a document before it hands it over. comark-linter lists every problem, each with its line. Outside a project that installs it, fetch it together with comark-ui, so it knows every block:

```sh
vp dlx --package comark-linter --package comark-ui lint-comark duck-audit.md
```

Marks also need a look, because a box can sit inside the image and still miss its target. `comark-annotate render` writes a standalone page next to the file. The agent opens it in a browser and takes a screenshot to confirm each mark sits on its target:

```sh
vp dlx comark-annotate render duck-audit.md -o duck-audit.html
```

## Writing for reviewers

Agents often write these documents as evidence on a pull request. [A review document](/recipes/review/) shows one put together from several plugins. [Sharing a review](/recipes/share/) shows how the agent publishes it to [Drop](https://drop.vitehub.dev/?utm_source=comark-ui&utm_medium=guide), where reviewers comment on the exact spot and the agent reads their comments.
