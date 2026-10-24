A `type` comark-charts doesn't draw falls back to the default: bars for names on x, a line for dates or numbers. The message lists the types it draws.

::incorrect
```md
::chart{type="column" title="Ducks per pond"}
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
::chart{type="bar" title="Ducks per pond"}
| pond | ducks |
| --- | --: |
| north | 12 |
| south | 7 |
| east | 9 |
::
```
::
