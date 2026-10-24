---
title: A pull request description
description: Its status from the frontmatter, the numbers that moved, the test run, and a suggestion still open, in one description.
keywords: PR description, PR body, GitHub
tagline: Write a pull request's description in Markdown, with its status on top and its evidence under it, and every block checked before it's posted.
install: pnpm add comark @comark/html comark-ui
---

::example{label="Pull request description"}
````md
---
status: Ready for review
pr: https://github.com/onmax/comark-ui/pull/111
author: onmax
tags: [map, performance]
---

:icon{name="lucide:rocket"} The pigeon map counts each plaza in a worker, so the page scrolls while it counts.

::stats{better="lower"}
| Metric | Before | After |
| --- | --- | --- |
| JavaScript | 412 kB | 388 kB |
| Largest paint | 2.4 s | 1.9 s |
::

::tests{title="Pigeon map tests"}
```xml
<testsuite name="map.test.ts" time="1.8">
  <testcase name="counts each plaza"/>
  <testcase name="keeps scrolling while it counts"/>
  <testcase name="shows a plaza with no pigeons as zero"/>
</testsuite>
```
::

:icon{name="lucide:message-circle"} The worker starts {~~on load~>on the first scroll~~}{>>Most visitors never scroll the map.<<}
````
::

## The order

A reviewer reads from the top, so each block answers the next question they'd ask:

1. The frontmatter holds what a script reads too: the status, the pull request, the author, and tags. [comark-properties](/properties/) shows them in a box at the top, and your tooling reads the same keys.
2. A sentence says what changed. An icon in front of it, from [comark-icon](/icon/), sets it apart from the evidence.
3. A `::stats` table from [comark-metrics](/metrics/) shows the numbers that moved, each with its change and whether it got better.
4. A `::tests` block from [comark-tests](/tests/) reads the JUnit report your test runner wrote, so the counts can't drift from the run.
5. A suggestion still open goes in CriticMarkup, from [comark-critic](/critic/), with the reason as a comment, so the reviewer sees what you'd change and why.

## Setup

Register the plugins in one renderer, as [Renderers](/guide/renderers/#several-plugins) shows. With a report on disk, point `::tests{src}` at it instead of pasting it in a fence, as [comark-tests](/tests/#usage) shows.

## Check it

Run [comark-linter](/lint/) on the file before you post it. A delta that can't be read, a report that isn't JUnit, and a suggestion left open each name their block and say how to fix it.
