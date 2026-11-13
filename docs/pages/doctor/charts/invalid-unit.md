`unit` prints a chart's numbers with their unit on its bars and its value axis. A gantt prints how long each bar lasts, and a sankey each node's amount, so neither takes `unit`. Put the unit in the amount's header instead.

::incorrect
```md
::chart{type="sankey" unit="$" title="Where the snack budget went"}
| from | to | amount |
| --- | --- | --: |
| budget | coffee | 410 |
| budget | biscuits | 160 |
::
```
::

::correct
```md
::chart{type="sankey" title="Where the snack budget went"}
| from | to | amount ($) |
| --- | --- | --: |
| budget | coffee | 410 |
| budget | biscuits | 160 |
::
```
::
