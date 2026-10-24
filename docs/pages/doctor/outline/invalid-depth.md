`depth` is the deepest heading level the list goes down to, from 2 to 6. Anything else, such as `7`, `h3`, or `three`, leaves the block empty, so the page shows no list at all.

::incorrect
```md
::toc{depth=h3}
::

## Ponds

### The north pond
```
::

::correct
```md
::toc{depth=3}
::

## Ponds

### The north pond
```
::
