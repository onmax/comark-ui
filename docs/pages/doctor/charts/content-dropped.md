A drawn chart keeps only its table and its annotations, so a paragraph inside the block is dropped. Name the chart with `title`, and write the rest before or after the block.

::incorrect
```md
::chart
Counted at dawn on Saturday.

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
Counted at dawn on Saturday.

::chart{title="Ducks per pond"}
| pond | ducks |
| --- | --: |
| north | 12 |
| south | 7 |
| east | 9 |
::
```
::
