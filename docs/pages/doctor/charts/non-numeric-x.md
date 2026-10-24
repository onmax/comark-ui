A scatter plot places each row by its x value on a number axis, so its x column holds numbers. With names or dates there, the chart falls back to bars or a line.

::incorrect
```md
::chart{type="scatter" title="Ducks and bread"}
| pond | bread (g) | ducks |
| --- | --: | --: |
| north | 400 | 12 |
| south | 150 | 7 |
| east | 250 | 9 |
::
```
::

::correct
```md
::chart{type="scatter" title="Ducks and bread"}
| bread (g) | ducks |
| --: | --: |
| 400 | 12 |
| 150 | 7 |
| 250 | 9 |
::
```
::
