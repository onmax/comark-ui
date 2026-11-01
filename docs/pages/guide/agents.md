---
title: Agents
description: onmax's agent skill for every package, and the commands an agent uses to check what it wrote.
keywords: AI, Claude, Claude Code, Codex, Cursor, LLM, skills, agent skills, prompt
tagline: Agents write most review documents. Install the skill so yours knows the syntax, then let it check its own work before it hands the document over.
---

## Skill

[onmax](https://github.com/onmax)'s agent skill covers every package: which block to use, its syntax, and how to check the result. The **For agents** button on each package's page copies the install command too.

The commands use the Vite+ CLI, installed once with `curl -fsSL https://vite.plus | bash`, or as [its guide](https://viteplus.dev/guide/global-cli) shows on Windows. `vp dlx` fetches packages and `vp exec` runs installed tools, through your project's package manager. Without Vite+, use `pnpm dlx` and `pnpm exec` with the same arguments.

```sh
vp dlx skills add onmax/comark-ui
```

In a pnpm workspace that has a package only through another one, `npx` finds the package but not its command, and stops with `not found`.

Pick `comark-ui` from the list of skills. `vp dlx skills add https://comark-ui.onmax.me` installs the same skill from this site.

A project that installs `comark-ui` can link the skill from `node_modules` instead, so it matches the installed version. Run `vp dlx skills experimental_sync` after each install, as [Skills](/skills/#from-npm) shows.

For a whole document, such as before/after evidence, a review, or a lesson, add the matching [skills](/skills/) from the same list.

## Markdown pages

Every page has a Markdown copy at its path plus `.md`, such as [`/zoom.md`](/zoom.md) for [`/zoom/`](/zoom/). A request with `Accept: text/markdown` gets the copy too. The **Copy page** button at the top copies it for a chat, and its menu opens the copy or asks ChatGPT or Claude to read it.

[`/llms.txt`](/llms.txt) lists every page's copy by section, and says how an agent reads the site.

## Bundle the skill in your app

An app that renders these documents for its own agents, like [Drop](https://drop.vitehub.dev/?utm_source=comark-ui&utm_medium=guide), can ship this skill. `comark-ui` includes it, so copy it at build time to match the installed plugins:

```ts
import { cp } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const skill = dirname(fileURLToPath(import.meta.resolve("comark-ui/skills/comark-ui/SKILL.md")));
await cp(skill, "skills/comark-ui", { recursive: true });
```

Keep the folder whole, since `SKILL.md` links each reference by its path. An app in a Worker can't read `node_modules`, so it imports every skill's files as text from `comark-ui/skills`, as [Skills](/skills/#bundle-them-in-your-app) shows. If your agents only write Markdown, cut each reference at its `## Register` heading, which always comes last.

## Check the result

comark-linter lists every problem in a document, each with its line. Outside a project that installs it, fetch it with comark-ui so it knows every block:

```sh
vp dlx --package comark-linter --package comark-ui comark-lint duck-audit.md
```

Marks need a look too, since a box can sit inside the image and still miss its target. [Install the CLI directly](/annotate/#cli) at the same version as the project's Comark UI packages. `comark-annotate render` writes a standalone page next to the file, and the agent screenshots it in a browser to confirm each mark sits on its target:

```sh
vp exec comark-annotate render duck-audit.md -o duck-audit.html
```

## Writing for reviewers

[A review document](/recipes/review/) builds pull request evidence from several plugins. [Sharing a review](/recipes/share/) shows how the agent publishes it to [Drop](https://drop.vitehub.dev/?utm_source=comark-ui&utm_medium=guide), where reviewers comment on the exact spot and the agent reads their comments.
