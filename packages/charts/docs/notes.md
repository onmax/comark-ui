---
title: Notes and targets
description: Hand-drawn marks and notes on a chart's data, and lines across it at a target.
keywords: annotation, callout, highlight, threshold, goal line, budget line, reference line
tagline: A hand-drawn mark on a chart's data and its note, or a line across the chart at a target.
---

::examples
:::example{label="With notes"}
```md
::chart{type="line" title="Coffee cups and commits, per month (r = 0.99)"}
| month | coffee cups | commits |
| --- | --: | --: |
| 2026-04 | 820 | 610 |
| 2026-05 | 890 | 640 |
| 2026-06 | 905 | 652 |
| 2026-07 | 960 | 715 |
| 2026-08 | 975 | 720 |
| 2026-09 | 1,030 | 768 |
| 2026-10 | 1,025 | 760 |
::::annotation{at="2026-07" series="commits" mark="circle" color="green"}
The new espresso machine arrives, and commits pass 700.
::::
::::annotation{at="2026-09" series="coffee cups" mark="none" side="top" color="red"}
Peak coffee.
::::
::
```
:::

:::example{label="Performance"}
```md
::chart{type="dumbbell" title="Largest Contentful Paint per page, before and after lazy-loading the editor (ms)"}
| page | before | after |
| --- | --: | --: |
| home | 2,480 | 1,120 |
| docs | 2,910 | 1,340 |
| blog post | 2,050 | 980 |
| playground | 4,350 | 4,100 |
::::annotation{at="playground" series="after" mark="circle" color="red"}
The playground opens the editor right away, so it stays slow.
::::
::
```
:::

:::example{label="Target line"}
```md
::chart{labels title="Minutes to the first review comment"}
| team | minutes |
| --- | --: |
| frontend | 38 |
| backend | 64 |
| design | 12 |
:::annotation{mark="line" value="45" color="red" side="right"}
Team goal: 45 min.
:::
::
```
:::
::

## Features

- Notes use [comark-annotate](/annotate/)'s marks and checks, and comark-charts installs it.
- The mark wraps the shape drawn for its value, such as a bar, a point, a slice, or a step.
- Marks stay on their data when the numbers change.
- Notes are numbered under the chart, as under a screenshot.
- A marked chart zooms like a screenshot.

## Usage

Put an `::annotation` inside the chart, after the table. Use the `at` prop to name the row it marks, by its x value as the table writes it. Write the note as the block's content.

::example
```md
::chart{title="Rubber ducks bought, by team"}
| team | ducks |
| --- | --: |
| backend | 41 |
| frontend | 18 |
:::annotation{at="backend"}
Bought in bulk after the Tuesday incident.
:::
::
```
::

> [!NOTE]
> Only the HTML renderer draws marks, as [Renderers](/charts/#renderers) explains.

### Series

Use the `series` prop to mark one column's value in the row. Without it, the mark covers every series in the row and their values, and a `circle` on bars also loops around the row's name.

::example
```md
::chart{title="Tabs-vs-spaces arguments per month"}
| team | sunny | rainy |
| --- | --: | --: |
| frontend | 12 | 31 |
| backend | 16 | 40 |
| design | 2 | 9 |
:::annotation{at="backend" series="rainy" mark="circle"}
The office flooded in March.
:::
::
```
::

On a [gantt chart](/charts/#gantt-charts), `series` names the bar's group instead, for a task that repeats across groups. On a [sankey](/charts/#sankey), `at` names a node from either column, and there's no `series`.

### Mark, color, and side

Use the `mark`, `color`, and `side` props as on a [screenshot's annotation](/annotate/components/annotation/). A side note sits in the margin with an arrow instead of in the list.

::example
```md
::chart{title="Pigeons on the roof, by weekday"}
| weekday | pigeons (average) |
| --- | --: |
| Wednesday | 2.8 |
| Thursday | 6.5 |
| Friday | 14.7 |
:::annotation{at="Friday" mark="highlight" color="amber" side="right"}
Someone feeds them on Fridays.
:::
::
```
::

### Target line

Use `mark="line"` with the `value` prop to draw a target, a budget, or a limit as a line across the plot. Write `value` as the table writes its numbers.

::example
```md
::chart{title="p95 per endpoint (ms)"}
| endpoint | p95 |
| --- | --: |
| /search | 410 |
| /login | 61 |
| /feed | 140 |
:::annotation{mark="line" value="200" color="red" side="right"}
The 200 ms budget.
:::
::
```
::

The line runs across an upright chart and down a sideways one. The value axis stretches to reach a target past the data. Its note goes in the numbered list, or in the margin with `side`.

> [!NOTE]
> A line crosses every row and series, so it takes no `at` or `series`. Pies, gantt charts, and sankeys have no value axis, so the plugin reports a line on them.

On a [screenshot](/annotate/components/annotation/#mark), `line` instead draws a stroke through the middle of its box.

## API

### Props

| Prop | Default | Description |
| --- | --- | --- |
| `at` | — | The x value of the row to mark, copied from the table, or on a sankey the node's name. Required, except on a line. |
| `series` | Every series in the row | The column to mark in that row. On a gantt chart, the group of the bar instead. |
| `value` | — | With `mark="line"`, the number on the value axis the line crosses at. |
| `mark` | `box` | `box`, `circle`, `underline`, `line`, `highlight`, `bracket`, `cross`, `check`, or `none`. |
| `color` | The chart's text color | `red`, `amber`, `green`, `blue`, `violet`, `gray`, or a 3- or 6-digit hex color. |
| `side` | — | `left`, `right`, `top`, or `bottom` for a side note with an arrow. |

### Issues

The plugin adds these problems to `meta.issues`:

- `at` is missing, or isn't an x value in the table.
- `series` names a column the chart doesn't draw.
- The mark points at an empty cell.
- A line has no number in `value`, or sits on a chart without a value axis.
- A line has `at` or `series`, or a mark that isn't a line has `value`.
- An unknown prop.
- The mark, color, side, and note have the problems comark-annotate checks on [screenshots](/annotate/components/annotation/#issues).

The chart draws without any mark the plugin can't place. Each problem has its own rule in [Doctor](/doctor/).
