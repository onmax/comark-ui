`::table` reads `src`, `format`, `sort`, and `copy`, and ignores every other prop. A misspelled `sort` leaves the headers as plain text.

::incorrect
```md
::table{src="ducks.csv" sortable}
::
```
::

::correct
```md
::table{src="ducks.csv" sort}
::
```
::
