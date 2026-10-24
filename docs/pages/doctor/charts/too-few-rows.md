A line or an area joins its rows, so one row draws nothing. The chart draws a bar instead. Add a row, or use `type="bar"`.

::incorrect
```md
::chart{type="line" title="Pigeons on the roof"}
| month | pigeons |
| --- | --: |
| 2026-09 | 14 |
::
```
::

::correct
```md
::chart{type="line" title="Pigeons on the roof"}
| month | pigeons |
| --- | --: |
| 2026-08 | 9 |
| 2026-09 | 14 |
::
```
::
