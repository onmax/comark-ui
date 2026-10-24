`cols` is how many columns `::columns` lays its cells in, a number from 1 to 6. Any other value, such as `four` or `12`, shows 2 columns.

::incorrect
```md
::columns{cols="four"}
14 ducks.

3 pigeons.

2 herons.

1 swan.
::
```
::

::correct
```md
::columns{cols="4"}
14 ducks.

3 pigeons.

2 herons.

1 swan.
::
```
::
