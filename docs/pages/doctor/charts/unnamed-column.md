Each header names its column on the chart, as the axis, the legend, or the label of a series, so a column without one can't be drawn. The block shows the table alone.

::incorrect
```md
::chart{title="Ducks per pond"}
|  | ducks |
| --- | --: |
| north | 12 |
| south | 7 |
| east | 9 |
::
```
::

::correct
```md
::chart{title="Ducks per pond"}
| pond | ducks |
| --- | --: |
| north | 12 |
| south | 7 |
| east | 9 |
::
```
::
