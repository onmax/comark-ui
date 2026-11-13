`log` puts numbers that span orders of magnitude on a log scale: alone for the numbers' axis, `log="x"` for the x column of a line or a scatter plot over numbers, or `log="both"`. Lines, scatter plots, and bar charts take it. A log scale has no zero, so stacks, areas, and pies, whose parts add up from zero, can't use one, and every number on a log axis must be above 0.

::incorrect
```md
::chart{type="line" log title="Time to first reply (h)"}
| week | median |
| --- | --: |
| 2026-09-07 | 1.2 |
| 2026-09-14 | 0 |
::
```
::

::correct
```md
::chart{type="line" log title="Time to first reply (h)"}
| week | median |
| --- | --: |
| 2026-09-07 | 1.2 |
| 2026-09-14 | 0.6 |
::
```
::
