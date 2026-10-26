A sankey reads three columns: where each flow comes from, where it goes, and how much. The first column is where it comes from, unless `x` names another; the next column of names is where it goes; and the column of numbers is the amount, unless `y` names one.

::incorrect
```md
::chart{type="sankey" title="Where the ducks went"}
| pond | ducks |
| --- | --: |
| north | 12 |
| south | 7 |
::
```
::

::correct
```md
::chart{type="sankey" title="Where the ducks went"}
| from | to | ducks |
| --- | --- | --: |
| the shop | north pond | 12 |
| the shop | south pond | 7 |
::
```
::
