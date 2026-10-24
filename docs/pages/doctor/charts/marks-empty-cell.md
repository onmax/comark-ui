An empty cell draws no bar or point, so a mark on it has nothing to sit on and isn't drawn. Fill in the number, mark another column with `series`, or mark another row.

::incorrect
```md
::chart{title="Birds per pond"}
| pond | ducks | geese |
| --- | --: | --: |
| north | 12 | 3 |
| south | 7 |  |
| east | 9 | 2 |
:::annotation{at="south" series="geese"}
Nobody counted the geese this week.
:::
::
```
::

::correct
```md
::chart{title="Birds per pond"}
| pond | ducks | geese |
| --- | --: | --: |
| north | 12 | 3 |
| south | 7 |  |
| east | 9 | 2 |
:::annotation{at="south"}
Nobody counted the geese this week.
:::
::
```
::
