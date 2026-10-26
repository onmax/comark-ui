---
title: Comark UI
description: The Component Library for Markdown
headline: The Component Library for Markdown
tagline: "Comark UI is a free, open source plugin library for Comark: 40+ blocks for docs, reviews, and agent reports, from tabs and charts to annotated screenshots, written in Markdown. Install them all with one package, or each on its own."
install: pnpm add comark @comark/html comark-ui
---

::packages
:::demo{package="lint"}
```md
::screnshot{src="/before.png"}
Moon phase and vibes wrap.
```
:::
::

::hero
## Written for agents. Read by people.

Your agent writes the review in Markdown and your team reads the page. When a block is wrong, the plugins say how to fix it.

````md
> [!TIP] Decision
> Moon and Vibes move into **+2 filters**.
> One row again. Fixes #51, as @onmax asked.

::screenshot{src="/after.png" alt="Filter toolbar on one row"}
:::annotation{x=68 y=33.1 w=13.3 h=16 mark="highlight"}
Moon and Vibes are in here now.
:::

:::annotation{x=92.5 y=33.1 w=10.9 h=16 mark="check" color="green"}
**Apply** fits on the first row.
:::
::

The numbers didn't move:

| Pair | Before | After |
| --- | --- | --- |
| Pizzas vs. merged PRs | 0.95 | 0.95 |
| Rubber ducks vs. bugs fixed | 0.97 | 0.97 |
| Drizzle vs. standup minutes | 0.84 | 0.84 |

::diff{label="Suggested change"}
```css [toolbar.css]
.filters { flex-wrap: wrap; }
```
```css
.filters { flex-wrap: nowrap; }
```
::
````

````md
> [!TIP] Decision
> Moon and Vibes move into **+2 filters**.
> One row again. Fixes #51, as @onmax asked.

::screenshot{src="/after.png" alt="Filter toolbar on one row"}
:::annotation{x=68 y=33.1 w=13.3 h=16 mark="highlight"}
Moon and Vibes are in here now.
:::

:::annotation{x=82.5 y=33.1 w=10.9 h=16 mark="check" color="green"}
**Apply** fits on the first row.
:::
::

The numbers didn't move:

| Pair | Before | After |
| --- | --- | --- |
| Pizzas vs. merged PRs | 0.95 | 0.95 |
| Rubber ducks vs. bugs fixed | 0.97 | 0.97 |
| Drizzle vs. standup minutes | 0.84 | 0.84 |

::diff{label="Suggested change"}
```css [toolbar.css]
.filters { flex-wrap: wrap; }
```
```css
.filters { flex-wrap: nowrap; }
```
::
````
::

::drop
## Share it on Drop

[Drop](https://drop.vitehub.dev) renders these documents as a page your team comments on, and connects to Claude Code, Codex, or any MCP agent.

1. Your agent drops the review.
2. You comment on the exact spot.
3. Your agent reads them and drops the next version.
::
