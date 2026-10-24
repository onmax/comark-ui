A row without an x value has nowhere to go on the chart, so it's left out. Fill it in, or remove the row.

::incorrect
```md
::chart{title="Ducks per pond"}
| pond | ducks |
| --- | --: |
| north | 12 |
|  | 7 |
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
