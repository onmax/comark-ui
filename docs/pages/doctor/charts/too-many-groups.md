A gantt colors its bars by one column of names, such as a phase or a run, and names each color in a legend. With two such columns it colors by the first and leaves the other out of the chart. Keep one, and say the other in the task's name or in the text around the chart.

::incorrect
```md
::chart{type="gantt" title="Pond cleanup (days)"}
| task | phase | crew | start | end |
| --- | --- | --- | --: | --: |
| drain the pond | prepare | ducks | 0 | 2 |
| fish out the shopping carts | clean | geese | 2 | 5 |
| refill | finish | ducks | 5 | 6 |
::
```
::

::correct
```md
::chart{type="gantt" title="Pond cleanup (days)"}
| task | phase | start | end |
| --- | --- | --: | --: |
| drain the pond | prepare | 0 | 2 |
| fish out the shopping carts | clean | 2 | 5 |
| refill | finish | 5 | 6 |
::
```
::
