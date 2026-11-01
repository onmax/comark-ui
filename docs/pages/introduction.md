---
title: Introduction
description: Comark UI is a library of 40+ Markdown blocks for Comark, for docs, reviews, and agent reports.
keywords: overview, what is, about, comark, markdown components, mdc, nuxt content
tagline: Comark UI is a free, open source library of 40+ blocks for Comark, for docs, reviews, and agent reports, written in Markdown.
---

## What is Comark UI?

[Comark](https://comark.dev) parses Markdown with blocks like `::tabs` and renders it with HTML, Vue, React, or Svelte. Comark UI adds the blocks, such as tabs, charts, annotated screenshots, and suggested code changes.

Install them all with `comark-ui`, or each block on its own. They share one version.

Comark UI is an independent project by [@onmax](https://github.com/onmax), not the Comark team.

## Key features

**Reads without a script**

Every block renders to HTML that reads on its own. Tabs, carousels, and zoom add behavior with a script.

**Same markup in every renderer**

HTML, Vue, React, and Svelte get the same markup, so one set of styles fits all four. [Renderers](/guide/renderers/) lists which package supports which.

**Never throws**

A block written wrong still renders. `meta.issues` gets one sentence that names the block and the fix. [Validation](/guide/validation/) shows how to read them.

**Themed by shadcn/ui tokens**

The blocks use [shadcn/ui](https://ui.shadcn.com)'s CSS variables, so they match a shadcn site with no setup. Elsewhere, the `--comark-*` tokens theme every block at once. [Theming](/guide/theming/) lists them.

**Made for agents**

A skill teaches agents the syntax, and [comark-linter](/lint/) checks what they write before anyone reads it. [Agents](/guide/agents/) sets both up.

## How it works

Each package is a parse plugin and a set of components.

1. The **parse plugin** reads its blocks while Comark parses. It checks props, fetches what it needs from the network or disk, such as a favicon, and reports problems.
2. The **components** draw the result in HTML, Vue, React, or Svelte.
3. The **script**, if the block has one, adds browser behavior such as switching tabs, zooming, or copying code.

## The blocks

| Section | What's in it |
| --- | --- |
| Review blocks | Annotated screenshots, diffs, embeds, chips, metrics, test results, and more. |
| Charts and diagrams | Charts from a Markdown table, gantt charts, and Mermaid, D2, Graphviz, and PlantUML diagrams. |
| Docs blocks | Badges, cards, details, fields, file trees, steps, and quizzes. |
| Page behavior | Zoom, carousels, tabs, code buttons, heading links, and a table of contents. |
| Typography | Markdown syntax: footnotes, definition lists, highlights, keys, figures, CriticMarkup, and CJK emphasis. |
| Linter | comark-linter checks documents from a script, the command line, ESLint, or Vite Doctor. |
| From remark | remark-to-comark moves a remark project to Comark and reports what it leaves to you. |

Each block's page starts with demos you can open in the [playground](/play/) and edit live.

## Next steps

::card-group
:::card{title="Installation" icon="lucide:download" to="/getting-started/"}
Install comark-ui and render every block with one import.
:::

:::card{title="Playground" icon="lucide:flask-conical" to="/play/"}
Write a document and see it render as you type.
:::

:::card{title="Review document" icon="lucide:file-check" to="/recipes/review/"}
Put screenshots, a diff, and notes into one review.
:::

:::card{title="Agents" icon="lucide:bot" to="/guide/agents/"}
Teach your agent the syntax with the comark-ui skill.
:::
::
