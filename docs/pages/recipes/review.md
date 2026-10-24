---
title: A review document
description: A decision, before/after screenshots, a code change, and a link to try it, in one review.
keywords: PR, pull request, evidence, code review, visual review
tagline: Put a pull request's evidence in one Markdown file. The reviewer reads the decision first, then sees it, then reads the code.
install: pnpm add comark @comark/html comark-ui
---

::example{label="Review document"}
````md
> [!IMPORTANT] Decision
> Moon phase and vibes collapse into **+2 filters**, so the toolbar stays on one row at 640px.

::compare{title="Filter toolbar at 640px"}
:::screenshot{src="/before.png" alt="Filter toolbar wrapping onto a second row" viewport="640x250"}
::::annotation{x=4.5 y=28.7 w=90.9 h=44.4 color="red"}
Moon phase and vibes don't fit, so the toolbar wraps and pushes the table down.
::::
:::

:::screenshot{src="/after.png" alt="Filter toolbar on one row" viewport="640x250"}
::::annotation{x=68 y=33.1 w=13.3 h=16 mark="highlight" color="blue"}
Moon phase and vibes collapse into **+2 filters**.
::::
:::
::

::diff{line=48 label="The change"}
```ts [src/toolbar.ts]
const visible = filters;
```
```ts
const visible = filters.slice(0, 3);
const hidden = filters.length - visible.length;
```
::

::zoom{title="Toolbar height"}
| Width | Before | After |
| --- | --: | --: |
| 640px | 105px | 56px |
| 1024px | 56px | 56px |
::

::embed{url="https://pr42.preview.example.com/correlations" title="Try it on the preview deployment"}
::
````
::

## The order

A reviewer decides whether to approve, so give them the decision first and the evidence after it:

1. A callout states what changed and why, in a sentence or two. `IMPORTANT` fits a decision, `WARNING` a risk the reviewer should weigh.
2. A `::compare` shows the change. Mark the problem in red on the before side and the fix on the after side, so the two sets of notes read as one story.
3. A `::diff` shows the lines that matter. Keep it to a few lines around the change, since the pull request already has the full diff.
4. A table of numbers goes in `::zoom`, so a wide one opens at full size.
5. A link card points to where the reviewer can try it.

## Setup

Register the plugins in one renderer, as [Renderers](/guide/renderers/#several-plugins) shows. This document needs annotate, diff, github, embed, and zoom. Annotate brings zoom with it for the screenshots, and `zoom()` adds it for the table.

## Check it

Run [comark-linter](/lint/) on the file before you post it, and open the rendered page to see that each mark sits on its target. [Agents](/guide/agents/#check-the-result) shows both commands.

## Share it

[Sharing a review](/recipes/share/) puts the document in front of reviewers, either on Drop, where they comment on the exact spot, or on a page you host.
