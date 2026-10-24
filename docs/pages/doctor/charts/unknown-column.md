`x` and `y` name columns by their headers, exactly as the table writes them. A name the table doesn't have leaves the chart with nothing to draw, so the block shows the table alone. Separate several `y` columns with commas.

::incorrect
```md
::chart{y="duck" title="Ducks per pond"}
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
::chart{y="ducks" title="Ducks per pond"}
| pond | ducks |
| --- | --: |
| north | 12 |
| south | 7 |
| east | 9 |
::
```
::
