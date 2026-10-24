---
title: annotation
description: Marks and notes on a chart's data, and lines across it at a target.
---

Point at data with [comark-annotate](/annotate/)'s marks. Put an `::annotation` inside the chart, after the table, and name the row it marks with `at`, the row's x value as the table writes it. Add `series` to mark one column's value rather than the whole row.

::example
```md
::chart{title="Rubber ducks bought, by team"}
| team | ducks |
| --- | --: |
| backend | 41 |
| frontend | 18 |
:::annotation{at="backend" color="red"}
Bought in bulk after the Tuesday incident.
:::
::
```
::

The renderer finds the shape it draws for that value, such as a bar, a point, a slice, or a step, and draws the mark around it. Marks stay on their data when the numbers change.

Notes are numbered under the chart, as under a screenshot, and a marked chart zooms like a screenshot. comark-annotate comes with comark-charts, and checks the marks the same way. Only the HTML renderer draws them, as [Renderers](/charts/#renderers) explains.

## Props

| Prop | What it does |
| --- | --- |
| `at` | The x value of the row to mark, copied from the table. Required, except on a line. |
| `series` | The column to mark in that row. Without it, the mark covers every series in the row. On a gantt, it names the group of the bar instead, for a task that repeats across groups. |
| `value` | With `mark="line"`, the number on the value axis the line crosses at. See [Lines](#lines). |
| `mark`, `color`, `side` | As on a [screenshot](/annotate/components/annotation/): `box`, `circle`, `underline`, `line`, `highlight`, `bracket`, `cross`, `check`, or `none`; a named or hex color; and `left`, `right`, or `top` for a side note with an arrow. |

## Lines

Draw a target, a budget, or a limit as a line across the plot: an `::annotation` with `mark="line"`, and `value`, the number on the value axis where it crosses, written as the table writes its numbers.

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

The line runs across an upright chart and down a sideways one, wherever its values run. The value axis grows to reach a value past the data, so a target nobody has met yet still shows. Its note is numbered under the chart, or sits in the margin with `side`, like any other mark's.

A line crosses every row and series, so it takes no `at` or `series`. Pies and gantts have no value axis, so the plugin reports a line on them. On a [screenshot](/annotate/components/annotation/), `line` draws a straight stroke through the middle of its box, along its longer side.

## Validation

The plugin reports a missing or unknown `at`, a `series` the chart doesn't draw, a mark on an empty cell, a line without a number in `value` or on a chart without a value axis, and the mark, color, and side, as comark-annotate checks them on screenshots. A mark the plugin can't place is left out, and the chart draws without it.
