`:delta` compares `from` with `to`, and `:progress` fills its bar from `value`. Without them there is nothing to draw, so the block renders empty.

::incorrect
```md
Ducks counted :delta{to=14}
```
::

::correct
```md
Ducks counted :delta{from=11 to=14}
```
::
