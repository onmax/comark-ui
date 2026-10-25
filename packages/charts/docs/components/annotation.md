---
title: annotation
description: Marks and notes on a chart's data, and lines across it at a target.
tagline: A hand-drawn mark on a chart's data and its note, or a line across the chart at a target.
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

## Features

- The renderer finds the shape it draws for the value, such as a bar, a point, a slice, or a step, and draws the mark around it.
- Marks stay on their data when the numbers change.
- Notes are numbered under the chart, as under a screenshot.
- A marked chart zooms like a screenshot.
- comark-annotate comes with comark-charts, and checks the marks the same way.

## Usage

Use the `at` prop to name the row to mark, copied from the table's x column. Write the note as the block's content.

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

> [!NOTE]
> Only the HTML renderer draws marks, as [Renderers](/charts/#renderers) explains.

### Series

Use the `series` prop to mark one column's value in the row. Without it, the mark covers every series in the row.

::example
```md
::chart{title="Coffee cups and commits, per month"}
| month | coffee cups | commits |
| --- | --: | --: |
| 2026-06 | 905 | 652 |
| 2026-07 | 960 | 715 |
| 2026-08 | 975 | 720 |
:::annotation{at="2026-07" series="commits" mark="circle" color="green"}
The new espresso machine arrives, and commits pass 700.
:::
::
```
::

On a gantt, `series` names the group of the bar instead, for a task that repeats across groups.

### Mark, color, and side

Use the `mark`, `color`, and `side` props as on a [screenshot's annotation](/annotate/components/annotation/). A side note sits in the margin with an arrow, instead of in the numbered list.

::example
```md
::chart{title="Coffee cups and commits, per month"}
| month | coffee cups | commits |
| --- | --: | --: |
| 2026-07 | 960 | 715 |
| 2026-08 | 975 | 720 |
| 2026-09 | 1,030 | 768 |
:::annotation{at="2026-09" series="coffee cups" mark="none" side="top" color="red"}
Peak coffee.
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

The line runs across an upright chart and down a sideways one, wherever its values run. The value axis grows to reach a value past the data, so a target nobody has met yet still shows. Its note is numbered under the chart, or sits in the margin with `side`, like any other mark's.

> [!NOTE]
> A line crosses every row and series, so it takes no `at` or `series`. Pies and gantts have no value axis, so the plugin reports a line on them.

On a [screenshot](/annotate/components/annotation/#mark), `line` draws a straight stroke through the middle of its box, along its longer side.

## API

### Props

| Prop | Default | Description |
| --- | --- | --- |
| `at` | — | The x value of the row to mark, copied from the table. Required, except on a line. |
| `series` | Every series in the row | The column to mark in that row. On a gantt, the group of the bar instead. |
| `value` | — | With `mark="line"`, the number on the value axis the line crosses at. |
| `mark` | `box` | `box`, `circle`, `underline`, `line`, `highlight`, `bracket`, `cross`, `check`, or `none`. |
| `color` | `violet` | `violet`, `red`, `amber`, `green`, `blue`, `gray`, or a 3- or 6-digit hex color. |
| `side` | — | `left`, `right`, `top`, or `bottom` for a side note with an arrow. |

### Issues

The plugin adds these problems to `meta.issues`:

- `at` is missing, or isn't an x value in the table.
- `series` names a column the chart doesn't draw.
- The mark points at an empty cell.
- A line has no number in `value`, or sits on a chart without a value axis.
- A line has `at` or `series`, or a mark that isn't a line has `value`.
- A prop isn't one of the above.
- The mark, color, side, and note have the problems comark-annotate checks on [screenshots](/annotate/components/annotation/#issues).

A mark the plugin can't place is left out, and the chart draws without it. Each problem has its own rule in [Doctor](/doctor/).
