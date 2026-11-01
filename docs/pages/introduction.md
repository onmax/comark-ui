---
title: Introduction
description: Comark UI is a library of 40+ Markdown blocks for Comark, for docs, reviews, and agent reports.
keywords: overview, what is, about, comark, markdown components, mdc, nuxt content
tagline: Comark UI is a free, open source library of 40+ blocks for Comark, for docs, reviews, and agent reports, written in Markdown.
---

## What is Comark UI?

[Comark](https://comark.dev) parses Markdown with blocks like `::tabs` into a tree, and renders it with HTML, Vue, React, or Svelte. Comark UI adds the blocks: tabs and charts, annotated screenshots, suggested code changes, callouts, and more.

You install every block with one package, `comark-ui`, or each block on its own. All of them share one version.

Comark UI is an independent project by [@onmax](https://github.com/onmax), not made by the Comark team.

## Key features

**Reads without a script**

Every block renders to HTML that reads on its own. Tabs, carousels, and zoom add behavior when their script runs, and the page still reads top to bottom when it doesn't.

**Same markup in every renderer**

The HTML, Vue, React, and Svelte renderers output the same markup, so the same styles and tokens apply to each. [Renderers](/guide/renderers/) lists which package supports which.

**Never throws**

A block that's written wrong still renders. Its problem goes in `meta.issues` as one sentence that names the block and says how to fix it. [Validation](/guide/validation/) shows how to read them.

**Themed by shadcn/ui tokens**

The blocks follow [shadcn/ui](https://ui.shadcn.com)'s CSS variables, so they match a site that uses them with no setup. Elsewhere, the `--comark-*` tokens theme every block at once. [Theming](/guide/theming/) lists them.

**Made for agents**

Agents write most of these documents. An agent skill teaches the syntax, and [comark-linter](/lint/) checks a document before anyone reads it. [Agents](/guide/agents/) shows how to set them up.

## How it works

Each package is a parse plugin and a set of components.

1. The **parse plugin** reads its blocks while Comark parses. It checks their props, does any work that needs the network or the disk, such as downloading a favicon, and reports problems.
2. The **components** draw the result in HTML, Vue, React, or Svelte.
3. The **script**, for blocks that have one, adds behavior in the browser: switching tabs, zooming, copying code.

## The blocks

| Section | What's in it |
| --- | --- |
| Review blocks | Annotated screenshots, diffs, embeds, chips, metrics, test results, and other blocks for reviews and reports. |
| Charts and diagrams | Charts from a Markdown table, gantt charts, and Mermaid, D2, Graphviz, and PlantUML diagrams. |
| Docs blocks | Badges, cards, details, fields, file trees, steps, and quizzes for documentation. |
| Page behavior | Zoom, carousels, tabs, code buttons, heading links, and a table of contents. |
| Typography | Markdown syntax: footnotes, definition lists, highlights, keys, figures, CriticMarkup, and CJK emphasis. |
| Linter | comark-linter, which checks documents from a script, the command line, ESLint, or Vite Doctor. |
| From remark | remark-to-comark, which moves a remark project to Comark and reports what it leaves to you. |

Each block's page starts with its demos. Open any demo in the [playground](/play/) to edit it live.

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
