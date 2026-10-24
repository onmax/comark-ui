---
title: gantt
description: Steps or tasks over time, such as a build, a deploy, or a plan, from a table of starts and ends.
keywords: timeline, roadmap, schedule
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

When the table has other numbers too, such as a duration, name the two with `y`, as in `y="start, end"`.

## Groups

A column of names, such as a phase, an owner, or a run, colors the bars, one color per name, with a legend over the chart. A task may then repeat in another group, like the same step in two runs. A column of numbers reads as times, so write numbered groups as names, like `shard 1`.

To mark a task that repeats, name its group in the [annotation](/charts/components/annotation/)'s `series`.

## Milestones and durations

A row that ends where it starts is a milestone, and draws as a diamond. Every other bar prints how long it lasts past its end. For numbers that's the difference, and for dates it's a span in the table's unit, such as `3y`, `2mo`, `7d`, or `1.5h`.

Every bar prints its own duration, so a gantt takes no `labels`. It has no value axis either, so it takes no line.

## Dates

Dates take the forms x does: `2026`, `2026-04`, `2026-04-15`, or an ISO date and time. A time without a zone is UTC, and the axis shows UTC, so the chart reads the same wherever it's drawn.

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

## Validation

The plugin reports a gantt without one start and one end column, a row missing either, a bar that ends before it starts, and two columns of names to color by. A row without a start or an end isn't drawn, and a gantt colors by its first column of names.
