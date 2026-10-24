A table with a header and no rows has no points to draw, so the block shows the empty table. Add one row per bar, point, or step.

::incorrect
```md
::chart{title="Ducks per pond"}
| pond | ducks |
| --- | --: |
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
