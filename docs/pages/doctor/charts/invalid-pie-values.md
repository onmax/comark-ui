A pie shows each row's share of a total, so its numbers can't be negative, and they can't all be 0. Either way the chart draws bars instead, which show a change or a zero as it is.

::incorrect
```md
::chart{type="pie" title="Change in ducks per pond"}
| pond | change |
| --- | --: |
| north | 3 |
| south | -1 |
| east | 2 |
::
```
::

::correct
```md
::chart{type="bar" title="Change in ducks per pond"}
| pond | change |
| --- | --: |
| north | 3 |
| south | -1 |
| east | 2 |
::
```
::
