`series` marks one column's value in the row, and names a column the chart draws. With any other name the mark covers the whole row. Leave `series` out to mark the row on purpose. On a gantt, `series` names a value of the column that groups the bars instead.

::incorrect
```md
::chart{title="Birds per pond"}
| pond | ducks | geese |
| --- | --: | --: |
| north | 12 | 3 |
| south | 7 | 5 |
| east | 9 | 2 |
:::annotation{at="south" series="goose"}
The geese chased the ducks off.
:::
::
```
::

::correct
```md
::chart{title="Birds per pond"}
| pond | ducks | geese |
| --- | --: | --: |
| north | 12 | 3 |
| south | 7 | 5 |
| east | 9 | 2 |
:::annotation{at="south" series="geese"}
The geese chased the ducks off.
:::
::
```
::
