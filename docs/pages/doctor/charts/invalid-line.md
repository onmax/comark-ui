An annotation with `mark="line"` crosses the plot at `value`, a number on the chart's value axis, written as the table writes its numbers. It crosses the whole plot, so it takes no `at` or `series`, and `value` does nothing without `mark="line"`. Pies and gantts have no value axis to cross.

::incorrect
```md
::chart{title="p95 per endpoint (ms)"}
| endpoint | p95 |
| --- | --: |
| /search | 410 |
| /login | 61 |
:::annotation{at="/search" mark="line" value="200 ms"}
The budget.
:::
::
```
::

::correct
```md
::chart{title="p95 per endpoint (ms)"}
| endpoint | p95 |
| --- | --: |
| /search | 410 |
| /login | 61 |
:::annotation{mark="line" value="200"}
The budget.
:::
::
```
::
