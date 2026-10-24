An annotation marks the row whose x value its `at` names, copied from the table as it's written there. Without `at`, or with a value the table doesn't have, the mark isn't drawn. On a gantt where a task repeats across groups, `series` names the group of the row it marks, and without it the mark goes on the first.

::incorrect
```md
::chart{title="Ducks per pond"}
| pond | ducks |
| --- | --: |
| north | 12 |
| south | 7 |
| east | 9 |
:::annotation{at="North"}
A family of eight moved in on Tuesday.
:::
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
:::annotation{at="north"}
A family of eight moved in on Tuesday.
:::
::
```
::
