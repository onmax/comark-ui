`horizontal` turns the bars of a `bar` or `stacked` chart sideways. Dumbbells and gantts always run sideways, and other types have no bars to turn. Write it alone, with no value.

::incorrect
```md
::chart{type="dumbbell" horizontal title="Page weight (kB)"}
| page | before | after |
| --- | --: | --: |
| home | 412 | 388 |
| docs | 530 | 470 |
::
```
::

::correct
```md
::chart{type="dumbbell" title="Page weight (kB)"}
| page | before | after |
| --- | --: | --: |
| home | 412 | 388 |
| docs | 530 | 470 |
::
```
::
