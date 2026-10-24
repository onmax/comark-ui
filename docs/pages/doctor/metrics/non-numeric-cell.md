Each row's change is worked out from its before and after cells, so both must be numbers, with commas if you like and an optional unit after them. A row with a word in either cell has an empty change.

::incorrect
```md
::stats
| Metric | Before | After |
| --- | --- | --- |
| Ducks fed | a few | 40 |
::
```
::

::correct
```md
::stats
| Metric | Before | After |
| --- | --- | --- |
| Ducks fed | 12 | 40 |
::
```
::
