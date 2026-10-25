---
title: gantt
description: Steps or tasks over time, such as a build, a deploy, or a plan, from a table of starts and ends.
keywords: timeline, roadmap, schedule
tagline: Steps or tasks over time, one bar per row, from a table of starts and ends.
---

A gantt draws one bar per row, top to bottom in table order. The first column names the bar, and two columns of numbers or of dates say where it starts and where it ends.

::example
```md
::chart{type="gantt" title="nuxt build, before and after the worker (s)"}
| step | run | start | end |
| --- | --- | --: | --: |
| compile client | before | 0 | 3.7 |
| compile server | before | 3.7 | 7.8 |
| compile client | after | 0 | 3.7 |
| compile server | after | 0.2 | 4.6 |
| ready | after | 4.6 | 4.6 |
::
```
::

## Features

- One bar per row, top to bottom in table order.
- A column of names colors the bars, with a legend over the chart.
- A row that ends where it starts draws as a diamond.
- Every bar prints how long it lasts.
- Dates read in UTC, so the chart reads the same wherever it's drawn.

## Usage

Use `type="gantt"` with a table of three columns: the bar's name, where it starts, and where it ends.

```md
::chart{type="gantt" title="A Friday deploy, minutes after 16:55"}
| step | start | end |
| --- | --: | --: |
| tests | 0 | 6 |
| build | 6 | 11 |
| deploy | 11 | 13 |
::
```

### Start and end

Use the `y` prop to name the start and end columns when the table has other numbers too, such as a duration.

```md
::chart{type="gantt" y="start, end" title="A Friday deploy, minutes after 16:55"}
| step | start | end | minutes |
| --- | --: | --: | --: |
| tests | 0 | 6 | 6 |
| build | 6 | 11 | 5 |
::
```

### Groups

Add a column of names, such as a phase, an owner, or a run, to color the bars, one color per name, with a legend over the chart. A task may then repeat in another group, like the same step in two runs.

> [!NOTE]
> A column of numbers reads as times, so write numbered groups as names, like `shard 1`.

To mark a task that repeats, name its group in the [annotation](/charts/components/annotation/#series)'s `series`.

### Milestones and durations

A row that ends where it starts is a milestone, and draws as a diamond. Every other bar prints how long it lasts past its end. For numbers that's the difference, and for dates it's a span in the table's unit, such as `3y`, `2mo`, `7d`, or `1.5h`.

Every bar prints its own duration, so a gantt takes no `labels`. It has no value axis either, so it takes no line.

### Dates

Use dates in the forms x takes: `2026`, `2026-04`, `2026-04-15`, or an ISO date and time. A time without a zone is UTC, and the axis shows UTC, so the chart reads the same wherever it's drawn.

::example
```md
::chart{type="gantt" title="The rubber duck rollout"}
| task | team | start | end |
| --- | --- | --- | --- |
| order the ducks | ops | 2026-01-05 | 2026-01-16 |
| one duck per desk | ops | 2026-01-19 | 2026-01-30 |
| duck debugging workshop | frontend | 2026-02-02 | 2026-02-06 |
| duck debugging workshop | backend | 2026-02-09 | 2026-02-13 |
| every bug explained to a duck | frontend | 2026-02-16 | 2026-02-16 |
::
```
::

## API

### Props

A gantt takes the chart's [props](/charts/#props), except `labels`.

### Issues

The plugin adds these problems to `meta.issues`:

- The table doesn't have one start and one end column.
- A row is missing its start or its end.
- A bar ends before it starts.
- The table has two columns of names to color by.

A row without a start or an end isn't drawn, and a gantt colors by its first column of names. Each problem has its own rule in [Doctor](/doctor/).
