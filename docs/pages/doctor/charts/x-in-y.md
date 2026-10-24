`x` is the column the chart is drawn along, and `y` the columns it draws over it. A column can't be both, so the block shows the table alone.

::incorrect
```md
::chart{x="pond" y="pond, ducks" title="Ducks per pond"}
| pond | ducks |
| --- | --: |
| north | 12 |
| south | 7 |
| east | 9 |
::
```
::

::correct
```md
::chart{x="pond" y="ducks" title="Ducks per pond"}
| pond | ducks |
| --- | --: |
| north | 12 |
| south | 7 |
| east | 9 |
::
```
::
