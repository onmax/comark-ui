Two rows with the same x value draw on the same spot: bars stack into one and a line doubles back. It's usually a row pasted twice. Only a scatter plot may repeat an x, and a gantt may repeat a task in another group, such as the same step in two runs.

::incorrect
```md
::chart{title="Ducks per pond"}
| pond | ducks |
| --- | --: |
| north | 12 |
| south | 7 |
| north | 9 |
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
