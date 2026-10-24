Each block inside `::columns` is a cell, so an empty one draws an empty grid. It usually means the closing `::` came before the content.

::incorrect
```md
::columns
::
```
::

::correct
```md
::columns
14 ducks.

3 pigeons.
::
```
::
