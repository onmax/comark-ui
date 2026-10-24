Every column the chart draws holds plain numbers, with commas between thousands if you like, such as `1,200`. A cell with a unit or a word in it isn't read, so that bar or point is left out. Put the unit in the header instead.

::incorrect
```md
::chart{title="Ducks per pond"}
| pond | ducks |
| --- | --: |
| north | 12 ducks |
| south | 7 |
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
