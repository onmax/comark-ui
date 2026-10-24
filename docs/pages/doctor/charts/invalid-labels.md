`labels` writes each value inside its bar or segment, or just past the bar's end where it doesn't fit, so it only applies to `bar` and `stacked` charts. Lines, areas, scatter plots, and pies have no bars to write on, and dumbbells, waterfalls, and gantts print their numbers already. Write it alone, with no value.

::incorrect
```md
::chart{type="line" labels title="Coffee cups per month"}
| month | cups |
| --- | --: |
| 2026-04 | 820 |
| 2026-05 | 1,020 |
::
```
::

::correct
```md
::chart{type="bar" labels title="Coffee cups per month"}
| month | cups |
| --- | --: |
| 2026-04 | 820 |
| 2026-05 | 1,020 |
::
```
::
