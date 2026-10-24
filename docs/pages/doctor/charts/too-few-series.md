A dumbbell joins two or more numbers in each row, such as a count before and after. With one column of numbers there's nothing to join, so the chart draws bars instead.

::incorrect
```md
::chart{type="dumbbell" title="Ducks per pond"}
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
::chart{type="dumbbell" title="Ducks per pond, spring and autumn"}
| pond | spring | autumn |
| --- | --: | --: |
| north | 12 | 15 |
| south | 7 | 6 |
| east | 9 | 11 |
::
```
::
