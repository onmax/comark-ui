A chart needs the x values in one column and the numbers in at least one more. A table with one column has nothing to draw against, so the block shows the table alone.

::incorrect
```md
::chart{title="Ducks counted"}
| ducks |
| --: |
| 12 |
| 7 |
| 9 |
::
```
::

::correct
```md
::chart{title="Ducks counted"}
| pond | ducks |
| --- | --: |
| north | 12 |
| south | 7 |
| east | 9 |
::
```
::
