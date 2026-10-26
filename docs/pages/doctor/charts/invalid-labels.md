`labels` prints a chart's numbers on its bars, beside its waterfall steps and dumbbell rows, or past its gantt bars. Lines, areas, scatter plots, and pies have none of those to print on, so read their numbers off the axis and the **Data** table. Write it alone, with no value.

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
