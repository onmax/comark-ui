A `::table` with `src` shows the file and drops whatever is written inside the block. Keep the data in one place: the file, or the block.

::incorrect
```md
::table{src="ducks.csv"}
| pond | ducks |
| --- | --- |
| Mill pond | 14 |
::
```
::

::correct
```md
::table{src="ducks.csv"}
::
```
::
