A pie divides one total and a waterfall walks one running sum, so each draws one column of numbers. With more, the chart draws only the first. Name the one to draw with `y`, or use bars to compare them.

::incorrect
```md
::chart{type="pie" title="Ducks per pond"}
| pond | ducks | geese |
| --- | --: | --: |
| north | 12 | 3 |
| south | 7 | 5 |
| east | 9 | 2 |
::
```
::

::correct
```md
::chart{type="pie" y="ducks" title="Ducks per pond"}
| pond | ducks | geese |
| --- | --: | --: |
| north | 12 | 3 |
| south | 7 | 5 |
| east | 9 | 2 |
::
```
::
