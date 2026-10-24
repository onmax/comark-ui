A chart draws the Markdown table inside it, and nothing else. Without a table there's nothing to draw, so the block shows its content as it is.

::incorrect
```md
::chart{title="Ducks per pond"}
- north: 12
- south: 7
- east: 9
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
